// hooks/useSchoolSchedule.js
import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

export const useSchoolSchedule = () => {
    const { config, currentDate } = useAppContext();
    const horarios = config.horarios || [];

    return useMemo(() => {
        if (!horarios.length || !currentDate) {
            return {
                currentTramo: null,
                nextTramo: null,
                progress: 0,
                timeLeftSeconds: 0,
                nextEvent: null
            };
        }

        const nowH = currentDate.getHours();
        const nowM = currentDate.getMinutes();
        const nowS = currentDate.getSeconds();
        const totalNowSeconds = (nowH * 60 + nowM) * 60 + nowS;

        // 1. Encontrar Tramo Actual
        const currentTramoIndex = horarios.findIndex(h => {
            const [iH, iM] = h.inicio.split(':').map(Number);
            const [fH, fM] = h.fin.split(':').map(Number);
            const startSec = (iH * 60 + iM) * 60;
            const endSec = (fH * 60 + fM) * 60;
            return totalNowSeconds >= startSec && totalNowSeconds < endSec;
        });

        const currentTramo = currentTramoIndex !== -1 ? horarios[currentTramoIndex] : null;

        // 2. Calcular Progreso del Tramo Actual
        let progress = 0;
        if (currentTramo) {
            const [iH, iM] = currentTramo.inicio.split(':').map(Number);
            const [fH, fM] = currentTramo.fin.split(':').map(Number);
            const startSec = (iH * 60 + iM) * 60;
            const endSec = (fH * 60 + fM) * 60;
            const elapsed = totalNowSeconds - startSec;
            const total = endSec - startSec;
            progress = Math.min(Math.max(elapsed / total, 0), 1);
        }

        // 3. Encontrar Siguiente Evento (Siguiente inicio o fin)
        const hitos = [];
        horarios.forEach(h => {
            const [iH, iM] = h.inicio.split(':').map(Number);
            const [fH, fM] = h.fin.split(':').map(Number);
            hitos.push({ time: (iH * 60 + iM) * 60, label: h.tramo, type: 'INICIO' });
            hitos.push({ time: (fH * 60 + fM) * 60, label: h.tramo, type: 'FIN' });
        });

        hitos.sort((a, b) => a.time - b.time);
        const nextEvent = hitos.find(h => h.time > totalNowSeconds);

        return {
            currentTramo,
            currentTramoIndex,
            nextTramo: currentTramoIndex !== -1 && currentTramoIndex < horarios.length - 1 ? horarios[currentTramoIndex + 1] : null,
            progress,
            nextEvent,
            timeLeftSeconds: nextEvent ? nextEvent.time - totalNowSeconds : 0
        };
    }, [horarios, currentDate]);
};
