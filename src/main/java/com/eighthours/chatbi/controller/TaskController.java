package com.eighthours.chatbi.controller;

import com.eighthours.chatbi.common.AuthContext;
import com.eighthours.chatbi.common.Result;
import com.eighthours.chatbi.dto.Dtos;
import com.eighthours.chatbi.entity.Task;
import com.eighthours.chatbi.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @PostMapping
    public Result<Task> create(@Valid @RequestBody Dtos.CreateTaskReq req) {
        return Result.ok(taskService.create(req.getName(), req.getStation(),
                req.getRobotType(), req.getTargetCount(), AuthContext.userId()));
    }

    @GetMapping
    public Result<List<Task>> list() {
        return Result.ok(taskService.list());
    }

    @PatchMapping("/{id}/assign")
    public Result<Task> assign(@PathVariable long id, @RequestBody Dtos.AssignReq req) {
        return Result.ok(taskService.assign(id, req.getOperatorId()));
    }

    @PatchMapping("/{id}/deliver")
    public Result<Task> deliver(@PathVariable long id) {
        return Result.ok(taskService.deliver(id));
    }

    @GetMapping("/{id}")
    public Result<Map<String, Object>> detail(@PathVariable long id) {
        return Result.ok(taskService.detail(id));
    }
}
