// utils/suppressWarnings.js
import { Platform } from 'react-native';

/**
 * Suprime warnings conocidos y esperados en diferentes plataformas
 */
export const suppressKnownWarnings = () => {
    if (Platform.OS === 'web') {
        // Suprimir warning de useNativeDriver en web (es esperado y normal)
        const originalWarn = console.warn;
        console.warn = (...args) => {
            const message = args[0];

            // Lista de warnings a suprimir
            const suppressedWarnings = [
                'useNativeDriver',
                'Animated: `useNativeDriver` is not supported',
            ];

            // Si el warning está en la lista de suprimidos, no lo mostramos
            if (typeof message === 'string' && suppressedWarnings.some(w => message.includes(w))) {
                return;
            }

            // Mostrar otros warnings normalmente
            originalWarn.apply(console, args);
        };
    }
};
