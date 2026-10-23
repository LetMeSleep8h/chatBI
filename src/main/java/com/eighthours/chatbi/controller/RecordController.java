package com.eighthours.chatbi.controller;

import com.eighthours.chatbi.common.Result;
import com.eighthours.chatbi.dto.Dtos;
import com.eighthours.chatbi.entity.Record;
import com.eighthours.chatbi.service.RecordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class RecordController {

    private final RecordService recordService;

    /** 上传数据（operator，multipart 文件 + 数据类型 + 元数据） */
    @PostMapping("/records")
    public Result<Record> upload(@RequestParam long taskId,
                                 @RequestParam("file") MultipartFile file,
                                 @RequestParam String dataType,
                                 @RequestParam(required = false) String meta) throws IOException {
        return Result.ok(recordService.upload(taskId, file, dataType, meta));
    }

    @GetMapping("/records")
    public Result<List<Record>> list(@RequestParam(required = false) String status) {
        return Result.ok(recordService.list(status));
    }

    @GetMapping("/records/mine")
    public Result<List<Record>> mine() {
        return Result.ok(recordService.myRecords());
    }

    /** 数据文件下载（audit：operator 仅限自己的记录） */
    @GetMapping("/records/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable long id) throws IOException {
        Resource resource = recordService.loadForDownload(id);
        String name = recordService.fileNameOf(id);
        String encoded = URLEncoder.encode(name, StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename*=UTF-8''" + encoded)
                .body(resource);
    }

    /** 审核（reviewer/admin，body: result=通过|打回, comment） */
    @PatchMapping("/records/{id}/review")
    public Result<Record> review(@PathVariable long id, @Valid @RequestBody Dtos.ReviewReq req) {
        return Result.ok(recordService.review(id, req.getResult(), req.getComment()));
    }
}
