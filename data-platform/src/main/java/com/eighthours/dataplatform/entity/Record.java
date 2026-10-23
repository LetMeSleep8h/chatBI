package com.eighthours.dataplatform.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("records")
public class Record {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long taskId;

    private Long operatorId;

    private String filePath;

    /** 工位号/采集时间/备注 等 JSON */
    private String metaJson;

    /** 待质检 / 通过 / 被打回 / 已重传 */
    private String status;

    private String reviewComment;

    private Long reviewedBy;

    private LocalDateTime reviewedAt;

    /** 原始文件名，用于幂等判断 */
    private String fileName;
}
