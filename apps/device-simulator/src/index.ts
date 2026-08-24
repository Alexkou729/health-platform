/**
 * Quantum Analyzer 设备模拟器
 *
 * 启动一个模拟的 USB HID 设备，通过 WebSocket / Socket.IO
 * 实时推送数据给云端后端和桌面端。
 *
 * 模拟的设备完全兼容原 Quantum Analyzer v13.6 协议:
 * - USB HID 多通道生物电采集 (ECG/EEG/EMG/BVP/GSR/TEMP/RESP)
 * - 60 秒实时数据流 (60Hz 采样率)
 * - CRC16-CCITT 校验
 * - 帧头 0xAA 0x55 / 帧尾 0x0D 0x0A
 *
 * 启动方式:
 *   pnpm simulator
 *   或
 *   node dist/index.js
 *   或带参数:
 *   node dist/index.js --port 8888 --api http://localhost:3000/api
 */
import { DeviceSimulator, PROTOCOL, encodeFrame, decodeFrame, parseDataFrame, type DetectionFrame } from '@health/device-driver';
import { io as ioClient, Socket } from 'socket.io-client';
import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

interface SimulatorArgs {
  port: number;            // WebSocket 端口 (供前端直接订阅)
  apiBase: string;         // 后端 API 地址
  deviceNo: string;        // 设备序列号
  autoStart: boolean;      // 是否自动开始模拟
  customerName?: string;
  customerAge?: number;
  customerGender?: number;
}

function parseArgs(): SimulatorArgs {
  const args = process.argv.slice(2);
  const opts: SimulatorArgs = {
    port: 8888,
    apiBase: 'http://localhost:3000/api',
    deviceNo: 'QA-SIM-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    autoStart: false,
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--port': opts.port = parseInt(args[++i]); break;
      case '--api': opts.apiBase = args[++i]; break;
      case '--device': opts.deviceNo = args[++i]; break;
      case '--auto-start': opts.autoStart = true; break;
      case '--customer': opts.customerName = args[++i]; break;
      case '--age': opts.customerAge = parseInt(args[++i]); break;
      case '--gender': opts.customerGender = parseInt(args[++i]); break;
      case '--help':
        console.log('用法: device-simulator [options]');
        console.log('  --port <port>       WebSocket 端口 (默认 8888)');
        console.log('  --api <url>         后端 API 地址 (默认 http://localhost:3000/api)');
        console.log('  --device <no>       设备序列号');
        console.log('  --auto-start        启动后立即开始模拟');
        console.log('  --customer <name>   模拟客户姓名');
        console.log('  --age <age>         模拟客户年龄');
        console.log('  --gender <0|1|2>    模拟客户性别');
        process.exit(0);
    }
  }
  return opts;
}

// ============================================
// 启动 HTTP + WebSocket 服务
// ============================================
const args = parseArgs();
console.log('\n╔════════════════════════════════════════╗');
console.log('║   Quantum Analyzer 设备模拟器 v1.0.0   ║');
console.log('╚════════════════════════════════════════╝\n');
console.log('设备序列号:', args.deviceNo);
console.log('WebSocket 端口:', args.port);
console.log('后端 API:', args.apiBase);

// 创建 HTTP + WebSocket 服务
const server = http.createServer();
const wss = new WebSocketServer({ server, path: '/ws' });

const connectedClients = new Set<WebSocket>();
const simulator = new DeviceSimulator({
  serialNo: args.deviceNo,
  sampleRate: 60,
  customer: {
    name: args.customerName || '演示客户',
    age: args.customerAge || 35,
    gender: args.customerGender || 1,
  },
});

// 当前会话状态
let currentSession: {
  sessionId?: string;
  detectionId?: string;
  customer?: any;
  startedAt: number;
  frames: DetectionFrame[];
  status: string;
} = {
  startedAt: 0,
  frames: [],
  status: 'IDLE',
};

let socketToBackend: Socket | null = null;

// ============================================
// 连接到云端后端
// ============================================
function connectToBackend() {
  if (socketToBackend?.connected) return;
  const wsUrl = args.apiBase.replace(/\/api$/, '');
  socketToBackend = ioClient(wsUrl + '/detection', {
    transports: ['websocket'],
    reconnection: true,
  });
  socketToBackend.on('connect', () => {
    console.log('✅ 已连接云端后端:', wsUrl);
  });
  socketToBackend.on('connect_error', (err) => {
    console.warn('⚠️  连接后端失败:', err.message);
  });
  socketToBackend.on('disconnect', () => {
    console.log('⛔ 与云端断开');
  });
}

// ============================================
// 设备模拟启动
// ============================================
simulator.start(
  (frame: DetectionFrame) => {
    currentSession.frames.push(frame);

    // 推送 WebSocket 客户端
    const payload = JSON.stringify({
      type: 'frame',
      deviceNo: args.deviceNo,
      detectionId: currentSession.detectionId,
      frame,
      progress: Math.min(100, (frame.elapsed / 60) * 100),
      phase: frame.elapsed < 3 ? 'CONNECTING' : frame.elapsed < 6 ? 'CALIBRATING' : 'COLLECTING',
      signalStrength: frame.signalStrength,
      heartRate: frame.heartRate,
      elapsedSec: Math.floor(frame.elapsed),
    });
    connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    });

    // 同步到后端
    if (socketToBackend?.connected && currentSession.detectionId) {
      socketToBackend.emit('progress', {
        detectionId: currentSession.detectionId,
        progress: Math.min(100, (frame.elapsed / 60) * 100),
        elapsedSec: Math.floor(frame.elapsed),
        signalStrength: frame.signalStrength,
        heartRate: frame.heartRate,
        phase: frame.elapsed < 3 ? 'CONNECTING' : frame.elapsed < 6 ? 'CALIBRATING' : 'COLLECTING',
      });
    }

    // 自动停止（60秒）
    if (frame.elapsed >= 60) {
      completeSession();
    }

    // 进度显示
    if (frame.sequence % 30 === 0) {
      process.stdout.write(`\r⏱  进度: ${Math.floor(frame.elapsed)}/60 秒 | 信号强度: ${frame.signalStrength.toFixed(0)}% | 心率: ${frame.heartRate} BPM   `);
    }
  },
  (err: any) => {
    console.error('设备错误:', err);
  }
);

async function completeSession() {
  simulator.stop();
  currentSession.status = 'COMPLETED';
  console.log('\n\n✅ 检测完成 (60秒)');
  console.log(`共采集 ${currentSession.frames.length} 帧数据`);

  // 上报完成到后端
  try {
    const rawPayload = {
      samples: currentSession.frames.map(f => f.channels[0]?.rawValue || 0),
      sampleRate: 60,
      durationMs: 60000,
      frames: currentSession.frames,
    };
    if (currentSession.detectionId) {
      const apiBase = args.apiBase.replace(/\/api$/, '');
      await fetch(`${apiBase}/api/detections/${currentSession.detectionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawPayload,
          overallScore: 75 + Math.floor(Math.random() * 15),
          constitution: 'BALANCED',
        }),
      });
      console.log('✅ 已上报云端，43 份报告生成中...');
    }
  } catch (e: any) {
    console.warn('⚠️  上报云端失败:', e.message);
  }

  // 通知 WebSocket 客户端完成
  const payload = JSON.stringify({
    type: 'completed',
    deviceNo: args.deviceNo,
    detectionId: currentSession.detectionId,
    totalFrames: currentSession.frames.length,
  });
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}

// ============================================
// WebSocket 客户端处理
// ============================================
wss.on('connection', (ws: WebSocket) => {
  console.log('🔌 新客户端连接');
  connectedClients.add(ws);

  ws.send(JSON.stringify({
    type: 'device_info',
    device: simulator.getDeviceInfo(),
  }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.action === 'start') {
        currentSession.detectionId = msg.detectionId;
        currentSession.customer = msg.customer;
        currentSession.startedAt = Date.now();
        currentSession.frames = [];
        currentSession.status = 'COLLECTING';
        console.log(`\n▶ 开始检测: ${msg.detectionId}`);
        ws.send(JSON.stringify({ type: 'started', detectionId: msg.detectionId }));
      } else if (msg.action === 'stop') {
        simulator.stop();
        completeSession();
      } else if (msg.action === 'status') {
        ws.send(JSON.stringify({
          type: 'status',
          status: currentSession.status,
          elapsed: currentSession.frames.length > 0 ? currentSession.frames[currentSession.frames.length - 1].elapsed : 0,
        }));
      }
    } catch (e) {
      console.warn('消息解析失败:', e);
    }
  });

  ws.on('close', () => {
    connectedClients.delete(ws);
    console.log('🔌 客户端断开');
  });
});

server.listen(args.port, () => {
  console.log(`\n✅ 设备模拟器已启动`);
  console.log(`   WebSocket: ws://localhost:${args.port}/ws`);
  console.log(`   HTTP 健康检查: http://localhost:${args.port}/health`);
  console.log('');
  connectToBackend();
  if (args.autoStart) {
    currentSession.detectionId = 'auto-' + Date.now();
    currentSession.startedAt = Date.now();
    currentSession.status = 'COLLECTING';
  }
});

// HTTP 健康检查
server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      device: simulator.getDeviceInfo(),
      session: {
        status: currentSession.status,
        frames: currentSession.frames.length,
      },
    }));
  }
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n\n⏹  正在停止...');
  simulator.stop();
  wss.close();
  server.close();
  if (socketToBackend) socketToBackend.close();
  process.exit(0);
});
