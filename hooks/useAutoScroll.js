// hooks/useAutoScroll.js
import { useEffect, useRef, useState } from 'react';
import { AUTO_SCROLL_SETTINGS } from '../constants/appConstants';

export const useAutoScroll = (dataDependency, speed = AUTO_SCROLL_SETTINGS.DEFAULT_SPEED, waitDuration = AUTO_SCROLL_SETTINGS.WAIT_DURATION_MS) => {
    const flatListRef = useRef(null);
    const [contentHeight, setContentHeight] = useState(0);
    const [layoutHeight, setLayoutHeight] = useState(0);

    // Using refs for animation state to avoid re-renders
    const scrollY = useRef(0);
    const waitCounter = useRef(0);
    const lastTime = useRef(performance.now());
    const animationFrameId = useRef(null);

    useEffect(() => {
        // Reset scroll when data changes
        scrollY.current = 0;
        waitCounter.current = 0;
        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: false });
        }
    }, [dataDependency]);

    useEffect(() => {
        if (!dataDependency || (Array.isArray(dataDependency) && dataDependency.length === 0)) {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            return;
        }

        const animate = (time) => {
            const deltaTime = time - lastTime.current;
            lastTime.current = time;

            if (flatListRef.current && contentHeight > layoutHeight) {
                const maxScroll = contentHeight - layoutHeight;

                if (scrollY.current >= maxScroll) {
                    waitCounter.current += deltaTime;
                    if (waitCounter.current >= waitDuration) {
                        scrollY.current = 0;
                        waitCounter.current = 0;
                        flatListRef.current.scrollToOffset({ offset: 0, animated: false });
                    }
                } else {
                    // Update scroll based on deltaTime for consistent speed
                    scrollY.current += speed * (deltaTime / 16.67); // Normalized to 60fps
                    if (scrollY.current > maxScroll) scrollY.current = maxScroll;

                    flatListRef.current.scrollToOffset({ offset: scrollY.current, animated: false });
                }
            }

            animationFrameId.current = requestAnimationFrame(animate);
        };

        animationFrameId.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, [contentHeight, layoutHeight, dataDependency, speed, waitDuration]);

    return {
        flatListRef,
        onContentSizeChange: (w, h) => setContentHeight(h),
        onLayout: (e) => setLayoutHeight(e.nativeEvent.layout.height),
    };
};
