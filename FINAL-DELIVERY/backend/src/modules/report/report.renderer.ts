import { Inject, Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class ReportRenderer {
  private readonly logger = new Logger(ReportRenderer.name);
  private browser;

  constructor(@Inject('PRISMA_CLIENT') private readonly prisma) {}

  async initBrowser() {
    if (process.env.NODE_ENV === 'test') return;
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      this.logger.log('Puppeteer 启动成功');
    } catch (e) {
      this.logger.warn('Puppeteer 启动失败: ' + e.message);
    }
  }

  async renderHtml(report) {
    const customer = report.customer || {};
    const score = report.score || 0;
    const scoreColor = score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
    const indicators = Array.isArray(report.indicators) ? report.indicators : [];
    const suggestions = Array.isArray(report.suggestions) ? report.suggestions : [];
    const warnings = Array.isArray(report.warnings) ? report.warnings : [];
    const highlights = Array.isArray(report.highlights) ? report.highlights : [];

    const indicatorHtml = indicators.slice(0, 12).map(ind => {
      const cls = ind.status === 0 ? 'normal' : ind.status >= 3 ? 'abnormal' : 'slight';
      const pct = Math.min(100, Math.max(0, ((ind.value - 50) / 50) * 100));
      return '<div class="indicator ' + cls + '">' +
        '<div class="name">' + ind.name + '</div>' +
        '<div class="value">' + ind.value + ' ' + ind.unit + '</div>' +
        '<div class="bar"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
        '</div>';
    }).join('');

    return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">' +
      '<title>' + report.title + '</title>' +
      '<style>' +
      '* { margin: 0; padding: 0; box-sizing: border-box; }' +
      'body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; background: linear-gradient(135deg, #0f172a, #1e293b); color: #e2e8f0; padding: 20px; min-height: 100vh; }' +
      '.container { max-width: 900px; margin: 0 auto; }' +
      '.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 20px; margin-bottom: 24px; position: relative; overflow: hidden; }' +
      '.header h1 { font-size: 28px; color: white; margin-bottom: 8px; }' +
      '.header .subtitle { color: rgba(255,255,255,0.8); font-size: 14px; }' +
      '.score-card { background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); padding: 30px; border-radius: 20px; text-align: center; margin-bottom: 24px; }' +
      '.score { font-size: 80px; font-weight: 700; color: ' + scoreColor + '; line-height: 1; }' +
      '.score-label { color: #94a3b8; margin-top: 8px; font-size: 14px; }' +
      '.info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }' +
      '.info-item { background: rgba(255,255,255,0.05); padding: 16px; border-radius: 12px; }' +
      '.info-item .label { color: #94a3b8; font-size: 12px; }' +
      '.info-item .value { color: white; font-size: 16px; font-weight: 600; margin-top: 4px; }' +
      '.section { background: rgba(255,255,255,0.05); padding: 24px; border-radius: 16px; margin-bottom: 16px; }' +
      '.section h2 { color: white; font-size: 18px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); }' +
      '.indicator-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }' +
      '.indicator { background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; }' +
      '.indicator .name { color: #cbd5e0; font-size: 13px; margin-bottom: 6px; }' +
      '.indicator .value { font-size: 18px; font-weight: 600; }' +
      '.indicator .bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 8px; overflow: hidden; }' +
      '.indicator .bar-fill { height: 100%; border-radius: 2px; }' +
      '.normal { color: #10b981; } .normal .bar-fill { background: #10b981; }' +
      '.slight { color: #f59e0b; } .slight .bar-fill { background: #f59e0b; }' +
      '.abnormal { color: #ef4444; } .abnormal .bar-fill { background: #ef4444; }' +
      '.suggestions li { padding: 8px 0; padding-left: 20px; position: relative; color: #cbd5e0; font-size: 14px; line-height: 1.6; }' +
      '.suggestions li::before { content: "✓"; position: absolute; left: 0; color: #10b981; font-weight: bold; }' +
      '.warnings li { padding: 8px 0; padding-left: 20px; position: relative; color: #fca5a5; font-size: 14px; }' +
      '.warnings li::before { content: "⚠"; position: absolute; left: 0; }' +
      '.conclusion { color: #cbd5e0; font-size: 14px; line-height: 1.8; }' +
      '.footer { text-align: center; padding: 30px 0; color: #64748b; font-size: 12px; }' +
      '</style></head><body><div class="container">' +
      '<div class="header"><h1>' + report.title + '</h1>' +
      '<div class="subtitle">检测时间：' + new Date(report.createdAt).toLocaleString('zh-CN') + '</div></div>' +
      '<div class="score-card"><div class="score">' + score + '</div><div class="score-label">综合健康评分</div></div>' +
      '<div class="info-grid">' +
      '<div class="info-item"><div class="label">姓名</div><div class="value">' + (customer.name || '-') + '</div></div>' +
      '<div class="info-item"><div class="label">性别</div><div class="value">' + (customer.gender === 1 ? '男' : customer.gender === 2 ? '女' : '-') + '</div></div>' +
      '<div class="info-item"><div class="label">年龄</div><div class="value">' + (customer.age || '-') + ' 岁</div></div>' +
      '<div class="info-item"><div class="label">报告编号</div><div class="value" style="font-size:12px;font-family:monospace">' + (report.id || '').substring(0, 8).toUpperCase() + '</div></div>' +
      '</div>' +
      '<div class="section"><h2>📋 评估结论</h2><p class="conclusion">' + (report.conclusion || '') + '</p></div>' +
      '<div class="section"><h2>📊 关键指标</h2><div class="indicator-grid">' + indicatorHtml + '</div></div>' +
      (warnings.length > 0 ? '<div class="section"><h2>⚠️ 重点关注</h2><ul class="warnings">' + warnings.map(w => '<li>' + w + '</li>').join('') + '</ul></div>' : '') +
      '<div class="section"><h2>💡 健康建议</h2><ul class="suggestions">' + suggestions.map(s => '<li>' + s + '</li>').join('') + '</ul></div>' +
      '<div class="footer"><p>本检测结果仅供参考，不作为诊断结论。</p><p style="margin-top:8px">健康管理系统 · Powered by Codex Health Platform</p></div>' +
      '</div></body></html>';
  }

  async renderPdf(report) {
    if (!this.browser) {
      const html = await this.renderHtml(report);
      return Buffer.from(html, 'utf8');
    }
    const page = await this.browser.newPage();
    const html = await this.renderHtml(report);
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    });
    await page.close();
    return pdf;
  }

  async onModuleInit() {
    await this.initBrowser();
  }
  async onModuleDestroy() {
    if (this.browser) await this.browser.close();
  }
}

