package com.eighthours.chatbi.controller;

import com.eighthours.chatbi.common.Result;
import com.eighthours.chatbi.dto.Dtos;
import com.eighthours.chatbi.entity.Record;
import com.eighthours.chatbi.service.RecordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class RecordController {

    private final RecordService recordService;


    @PostMapping("/records")
    public Result<Record> upload(@RequestParam long taskId,
                                 @RequestParam("file") MultipartFile file,
                                 @RequestParam(required = false) String meta) throws IOException {
        return Result.ok(recordService.upload(taskId, file, meta));
    }


    @GetMapping("/records")
    public Result<List<Record>> list(@RequestParam(required = false) String status) {
        return Result.ok(recordService.list(status));
    }


    @GetMapping("/records/mine")
    public Result<List<Record>> mine() {
        return Result.ok(recordService.myRecords());
    }


    @PatchMapping("/records/{id}/review")
    public Result<Record> review(@PathVariable long id, @Valid @RequestBody Dtos.ReviewReq req) {
        return Result.ok(recordService.review(id, req.getResult(), req.getComment()));
    }
}
