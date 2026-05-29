-- ============================================
-- 管理后台迁移脚本
-- 执行方式: mysql -u root -p diet_plan < migration_add_admin.sql
-- ============================================

USE diet_plan;

-- 1. 用户表新增 role 字段
ALTER TABLE users
  ADD COLUMN role TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0:普通用户 1:管理员',
  ADD COLUMN status TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0:禁用 1:启用';

-- 2. 管理员操作日志表
CREATE TABLE IF NOT EXISTS admin_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL COMMENT '操作的管理员ID',
  action VARCHAR(50) NOT NULL COMMENT '操作类型',
  target_type VARCHAR(30) NOT NULL COMMENT '操作目标类型(user/food/plan/system)',
  target_id INT COMMENT '操作目标ID',
  detail VARCHAR(500) COMMENT '操作详情(JSON)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 系统设置表
CREATE TABLE IF NOT EXISTS system_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(50) NOT NULL UNIQUE,
  config_value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 系统公告表
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
