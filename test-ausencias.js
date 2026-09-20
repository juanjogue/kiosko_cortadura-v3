// TEST: Verificar procesamiento de ausencias
// Este archivo puede ejecutarse para probar que los datos se obtienen correctamente

import { getAusencias } from './services/dataService.js';

const TEST_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vShyK5np1YxNiTfE36yvmR05zFO4ji0-_YW-6UMmKJ3AopDDsZW5Hz1lmzcNfyadtt51-gs5aNx4XER/pub?gid=2111711524&single=true&output=csv';

async function testAusencias() {
    console.log('🧪 Probando carga de ausencias...\n');

    try {
        const ausencias = await getAusencias(TEST_URL);

        console.log('✅ Datos obtenidos correctamente!');
        console.log(`📊 Total de registros: ${ausencias.length}\n`);

        if (ausencias.length > 0) {
            console.log('📋 Primer registro:');
            console.log(JSON.stringify(ausencias[0], null, 2));

            console.log('\n📋 Estructura de datos:');
            ausencias.forEach((ausencia, index) => {
                console.log(`\n${index + 1}. ${ausencia.profesor}`);
                console.log(`   Fecha: ${ausencia.fecha}`);
                console.log(`   Horas: ${Object.keys(ausencia.horas).join(', ')}`);

                Object.entries(ausencia.horas).forEach(([hora, datos]) => {
                    console.log(`   - ${hora}: Grupo=${datos.grupo}, Aula=${datos.aula}, Tarea=${datos.tarea}`);
                });
            });
        }

        console.log('\n✅ ¡Prueba completada con éxito!');

    } catch (error) {
        console.error('❌ Error al obtener ausencias:', error.message);
        console.error(error);
    }
}

testAusencias();
