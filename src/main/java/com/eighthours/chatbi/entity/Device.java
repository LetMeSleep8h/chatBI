package com.eighthours.chatbi.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("devices")
public class Device {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String station;

    private String deviceType;

    /** 在线 / 离线 / 故障 */
    private String status;

    private LocalDateTime lastHeartbeat;
}
