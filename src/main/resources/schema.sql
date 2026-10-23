-- 数据采集平台：重建脚本（每次启动重建，旧数据不迁移）
DROP TABLE IF EXISTS records;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(64)  NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    role          VARCHAR(16)  NOT NULL COMMENT 'admin / operator / reviewer'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE tasks (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(128) NOT NULL,
    station         VARCHAR(64)  NOT NULL,
    robot_type      VARCHAR(64)  NOT NULL COMMENT '机器人类型',
    target_count    INT          NOT NULL,
    collected_count INT          NOT NULL DEFAULT 0,
    status          VARCHAR(16)  NOT NULL DEFAULT '待分配' COMMENT '待分配 → 采集中 → 待质检 → 已交付',
    assignee_id     BIGINT       NULL,
    created_by      BIGINT       NOT NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE records (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id        BIGINT       NOT NULL,
    operator_id    BIGINT       NOT NULL,
    data_url       VARCHAR(512) NOT NULL COMMENT '数据文件路径',
    data_type      VARCHAR(16)  NOT NULL COMMENT '视频 / 触觉 / 关节角度',
    meta_json      VARCHAR(2048) NULL COMMENT '工位号/采集时间/备注',
    status         VARCHAR(16)  NOT NULL DEFAULT '待质检' COMMENT '待质检 / 通过 / 被打回 / 已重传',
    review_comment VARCHAR(512) NULL,
    reviewed_by    BIGINT       NULL,
    reviewed_at    DATETIME     NULL,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间（审计）',
    file_name      VARCHAR(256) NOT NULL DEFAULT '',
    KEY idx_task (task_id),
    KEY idx_operator_status (operator_id, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE devices (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    station        VARCHAR(64) NOT NULL,
    device_type    VARCHAR(64) NOT NULL,
    status         VARCHAR(16) NOT NULL DEFAULT '在线' COMMENT '在线 / 离线 / 故障',
    last_heartbeat DATETIME    NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 设备假数据（本期前端只读展示）
INSERT INTO devices (station, device_type, status, last_heartbeat) VALUES
('A-01', 'UR5e 机械臂',      '在线', NOW()),
('A-02', 'UR5e 机械臂',      '在线', NOW()),
('B-01', 'xArm7 机械臂',     '故障', DATE_SUB(NOW(), INTERVAL 35 MINUTE)),
('B-02', 'RealSense D435i',  '在线', NOW()),
('C-01', '触觉传感阵列',     '离线', DATE_SUB(NOW(), INTERVAL 6 HOUR)),
('C-02', '关节角度采集器',   '在线', NOW());
