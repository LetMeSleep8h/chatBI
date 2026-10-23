package com.eighthours.chatbi.controller;

import com.eighthours.chatbi.common.Result;
import com.eighthours.chatbi.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class StatsController {

    private final TaskService taskService;

    /** 顶部统计条：进行中任务数 / 今日已采条数 / 待质检条数 / 在线工位数 */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.ok(taskService.stats());
    }
}
