package com.eighthours.dataplatform.controller;

import com.eighthours.dataplatform.common.Result;
import com.eighthours.dataplatform.dto.Dtos;
import com.eighthours.dataplatform.entity.Record;
import com.eighthours.dataplatform.service.RecordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Tag(name = "数据条目")
@RestController
@RequiredArgsConstructor
public class RecordController {

    private final RecordService recordService;

    @Operation(summary = "上传数据（operator，multipart 文件 + meta）")
    @PostMapping("/records")
    public Result<Record> upload(@RequestParam long taskId,
                                 @RequestParam("file") MultipartFile file,
                                 @RequestParam(required = false) String meta) throws IOException {
        return Result.ok(recordService.upload(taskId, file, meta));
    }

    @Operation(summary = "数据列表（reviewer/admin，可按 status 过滤，如 待质检）")
    @GetMapping("/records")
    public Result<List<Record>> list(@RequestParam(required = false) String status) {
        return Result.ok(recordService.list(status));
    }

    @Operation(summary = "我的上传记录（operator）")
    @GetMapping("/records/mine")
    public Result<List<Record>> mine() {
        return Result.ok(recordService.myRecords());
    }

    @Operation(summary = "审核（reviewer/admin，body: result=通过|打回, comment）")
    @PatchMapping("/records/{id}/review")
    public Result<Record> review(@PathVariable long id, @Valid @RequestBody Dtos.ReviewReq req) {
        return Result.ok(recordService.review(id, req.getResult(), req.getComment()));
    }
}
