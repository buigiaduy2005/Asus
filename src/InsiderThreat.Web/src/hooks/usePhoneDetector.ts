import { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export function usePhoneDetector() {
    const [isPhoneDetected, setIsPhoneDetected] = useState(false);
    const [isLoadingAI, setIsLoadingAI] = useState(true);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameraGranted, setCameraGranted] = useState(false);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
    const requestAnimationFrameId = useRef<number | null>(null);
    const detectionCountRef = useRef(0);

    // Bắt đầu bật camera và load AI
    useEffect(() => {
        let isMounted = true;

        // Hàm quét frame liên tục
        const detectFrame = async () => {
            if (!isMounted) return;
            if (!videoRef.current || !modelRef.current) return;

            // Nếu video bị dừng, không quét nữa
            if (videoRef.current.paused || videoRef.current.ended) return;

            try {
                // Quét hình ảnh từ video element
                const predictions = await modelRef.current.detect(videoRef.current);
                
                // Tìm xem có đối tượng 'cell phone' nào không với độ tin cậy > 50%
                const phoneDetected = predictions.some(
                    p => p.class === 'cell phone' && p.score > 0.50
                );

                // Debounce: Phải quét thấy liên tục 2-3 frame thì mới khóa màn hình tránh nháy nhầm
                if (phoneDetected) {
                    detectionCountRef.current += 1;
                    if (detectionCountRef.current > 2) {
                        setIsPhoneDetected(true);
                    }
                } else {
                    detectionCountRef.current = 0;
                    setIsPhoneDetected(false); // Ngay khi bỏ điện thoại xuống, mở khóa ngay
                }
            } catch (error) {
                console.error("Lỗi khi quét frame:", error);
            }

            // Lặp lại liên tiếp
            requestAnimationFrameId.current = requestAnimationFrame(() => detectFrame());
        };

        const initializeDetector = async () => {
            try {
                // 1. Xin quyền Camera
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (!isMounted) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                // 2. Load mồ hình AI
                await tf.ready();
                const model = await cocoSsd.load();
                
                if (!isMounted) return;
                modelRef.current = model;
                
                // 3. Tạo thẻ video ảo ẩn để stream hình ảnh cho AI đọc
                const videoElement = document.createElement('video');
                videoElement.srcObject = stream;
                videoElement.muted = true;
                videoElement.setAttribute('playsinline', 'true'); // Cần cho một số trình duyệt
                
                // Đợi video load xong metadata để lấy kích thước
                await videoElement.play();
                
                videoElement.width = videoElement.videoWidth || 640;
                videoElement.height = videoElement.videoHeight || 480;
                videoRef.current = videoElement;

                setCameraGranted(true);
                setIsLoadingAI(false);

                // Bắt đầu vòng lặp quét
                detectFrame();

            } catch (err: any) {
                console.error("Lỗi khởi tạo Camera hoặc AI:", err);
                if (!isMounted) return;
                setIsLoadingAI(false);
                setCameraGranted(false);
                setCameraError(`Hệ thống không thể khởi tạo: ${err.message || err.toString()}`);
            }
        };

        initializeDetector();

        // Cleanup function khi component unmount
        return () => {
            isMounted = false;
            if (requestAnimationFrameId.current) {
                cancelAnimationFrame(requestAnimationFrameId.current);
            }
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return { isPhoneDetected, isLoadingAI, cameraError, cameraGranted };
}
