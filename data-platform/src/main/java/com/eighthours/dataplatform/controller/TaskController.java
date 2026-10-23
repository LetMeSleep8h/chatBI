package com.eighthours.dataplatform.controller;

import com.eighthours.dataplatform.common.AuthContext;
import com.eighthours.dataplatform.common.Result;
import com.eighthours.dataplatform.dto.Dtos;
import com.eighthours.dataplatform.entity.Task;
import com.eighthours.dataplatform.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "任务")
@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @Operation(summary = "创建任务（仅 admin）")
    @PostMapping
    public Result<Task> create(@Valid @RequestBody Dtos.CreateTaskReq req) {
        return Result.ok(taskService.create(req.getName(), req.getStation(),
                req.getTargetCount(), AuthContext.userId()));
    }

    @Operation(summary = "任务列表（operator 只见自己的）")
    @GetMapping
    public Result<List<Task>> list() {
        return Result.ok(taskService.list());
    }

    @Operation(summary = "分配操作员（仅 admin，待分配 → 采集中）")
    @PatchMapping("/{id}/assign")
    public Result<Task> assign(@PathVariable long id, @RequestBody Dtos.AssignReq req) {
        return Result.ok(taskService.assign(id, req.getOperatorId()));
    }

    @Operation(summary = "任务详情（含完成数/目标数与数据条目列表）")
    @GetMapping("/{id}")
    public Result<Map<String, Object>> detail(@PathVariable long id) {
        return Result.ok(taskService.detail(id));
    }
}
