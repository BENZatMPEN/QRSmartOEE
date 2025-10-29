// lib/axios.js
import axios from "axios";

// สร้าง instance สำหรับ backend 1
export const api_oee = axios.create({
  baseURL: "/api-oee",
});

// สร้าง instance สำหรับ backend 2
export const api_qr = axios.create({
  baseURL: "/api-qr",
});

// Interceptor สำหรับ api_oee (ใช้ Bearer Token)
api_oee.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- vvvv นี่คือส่วนที่แก้ไขสำหรับ api_qr vvvv ---
api_qr.interceptors.request.use((config) => {
  // 1. ดึงค่า username และ password จาก Environment Variables
  const username = process.env.NEXT_PUBLIC_QR_API_USERNAME;
  const password = process.env.NEXT_PUBLIC_QR_API_PASSWORD;

  // 2. ตรวจสอบว่ามีค่าหรือไม่ ก่อนที่จะสร้าง Header
  if (username && password) {
    const credentials = btoa(`${username}:${password}`);
    config.headers.Authorization = `Basic ${credentials}`;
  } else {
    // แจ้งเตือนใน Console หากไม่พบค่าใน .env
    console.warn("QR API credentials are not set in environment variables.");
  }

  return config;
});
