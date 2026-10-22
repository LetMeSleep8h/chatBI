package com.eighthours.chatbi.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/bi")
public class HeathController {
    @GetMapping("/heath")
    public String heath(){
        return "heath";
    }

    @GetMapping("/test")
    public String test(){
        return "test";
    }
}
