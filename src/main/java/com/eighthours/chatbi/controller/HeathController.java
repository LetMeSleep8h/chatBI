package com.eighthours.chatbi.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HeathController {
    @PostMapping("/heath")
    public String heath(){
        return "heath";
    }

}
