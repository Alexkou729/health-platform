# yumnai-noble

Yunmai scales BLE node app in docker

## Idea

![Idea](idea.jpg)

## Install on Raspberry Pi

1. Install docker
2. `docker run` the container
```
$ curl -fsSL https://raw.githubusercontent.com/Vanuan/yunmai-noble/master/run.sh | sh
```

## Development (on any laptop that supports BLE)
```
$ docker-compose up --build
...
yunmai_1  | Bluetooth poweredOn
yunmai_1  | Looking for peripheral...
yunmai_1  | Yunmai scales detected
yunmai_1  | Waiting for weighting...
yunmai_1  | Tue Oct 31 2017 10:07:22 GMT+0000 (UTC) 7.41 kg
yunmai_1  | Tue Oct 31 2017 10:07:22 GMT+0000 (UTC) 7.53 kg
yunmai_1  | Tue Oct 31 2017 10:07:23 GMT+0000 (UTC) 7.41 kg
yunmai_1  | Tue Oct 31 2017 10:07:23 GMT+0000 (UTC) 7.37 kg
yunmai_1  | Tue Oct 31 2017 10:07:23 GMT+0000 (UTC) 7.33 kg
yunmai_1  | Tue Oct 31 2017 10:07:23 GMT+0000 (UTC) 7.23 kg
yunmai_1  | Tue Oct 31 2017 10:07:23 GMT+0000 (UTC) 7.27 kg
yunmai_1  | Tue Oct 31 2017 10:07:24 GMT+0000 (UTC) 7.31 kg
yunmai_1  | Tue Oct 31 2017 10:07:24 GMT+0000 (UTC) 7.31 kg
```



---

> 📌 **最新功能与状态请看 上线交付/00-更新日志-最新功能与状态.md（v1.1）**。
> 学术诚实声明：原系统"量子弱磁场共振分析仪"的"522 项器官指标"已被 315 消费者权益日及 Quackwatch 列为伪科学。**PB-66 实测为飞天诚信 Rockey 加密狗，非生理传感器**。系统的真实检测能力基于循证医学算法，AI 解读由 MiniMax-M3 等大模型结合中医体质算法生成，仅作参考，由专业医师把关。
