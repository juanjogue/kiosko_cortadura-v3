import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
    useAnimatedProps,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';
import Svg, { Circle, Defs, FeGaussianBlur, Filter } from 'react-native-svg';
import { useAppContext } from '../context/AppContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Premium Animated Background
 * Creates a slow-moving "mesh gradient" effect using SVG circles with blur.
 * Optimized with react-native-reanimated for all platforms.
 */
const AnimatedBackground = () => {
    const { isDark, theme } = useAppContext();
    const { width, height } = useWindowDimensions();

    // Shared values for positions
    const b1X = useSharedValue(width * 0.1);
    const b1Y = useSharedValue(height * 0.1);
    const b2X = useSharedValue(width * 0.8);
    const b2Y = useSharedValue(height * 0.8);
    const b3X = useSharedValue(width * 0.5);
    const b3Y = useSharedValue(height * 0.4);

    useEffect(() => {
        const duration = 20000;

        b1X.value = withRepeat(withTiming(width * 0.6, { duration: duration * 1.5 }), -1, true);
        b1Y.value = withRepeat(withTiming(height * 0.4, { duration: duration * 1.2 }), -1, true);

        b2X.value = withRepeat(withTiming(width * 0.2, { duration: duration * 1.8 }), -1, true);
        b2Y.value = withRepeat(withTiming(height * 0.2, { duration: duration * 2 }), -1, true);

        b3X.value = withRepeat(withTiming(width * 0.8, { duration: duration * 1.3 }), -1, true);
        b3Y.value = withRepeat(withTiming(height * 0.7, { duration: duration * 1.6 }), -1, true);
    }, [width, height, b1X, b1Y, b2X, b2Y, b3X, b3Y]);

    const props1 = useAnimatedProps(() => ({ cx: b1X.value, cy: b1Y.value }));
    const props2 = useAnimatedProps(() => ({ cx: b2X.value, cy: b2Y.value }));
    const props3 = useAnimatedProps(() => ({ cx: b3X.value, cy: b3Y.value }));

    const colors = isDark
        ? ['#3b82f6', '#8b5cf6', '#06b6d4']
        : ['#93c5fd', '#c4b5fd', '#a5f3fc'];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                    <Filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
                        <FeGaussianBlur in="SourceGraphic" stdDeviation={Platform.OS === 'web' ? 80 : 50} />
                    </Filter>
                </Defs>

                {/* Blob 1 */}
                <AnimatedCircle
                    animatedProps={props1}
                    r={width * 0.4}
                    fill={colors[0]}
                    fillOpacity={isDark ? 0.15 : 0.2}
                    filter="url(#blur)"
                />

                {/* Blob 2 */}
                <AnimatedCircle
                    animatedProps={props2}
                    r={width * 0.35}
                    fill={colors[1]}
                    fillOpacity={isDark ? 0.15 : 0.2}
                    filter="url(#blur)"
                />

                {/* Blob 3 */}
                <AnimatedCircle
                    animatedProps={props3}
                    r={width * 0.45}
                    fill={colors[2]}
                    fillOpacity={isDark ? 0.1 : 0.15}
                    filter="url(#blur)"
                />
            </Svg>

            {/* Premium Grainy/Texture Overlay */}
            <LinearGradient
                colors={['rgba(255,255,255,0.01)', 'transparent', 'rgba(0,0,0,0.01)']}
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
        zIndex: -1,
    },
});

export default AnimatedBackground;
