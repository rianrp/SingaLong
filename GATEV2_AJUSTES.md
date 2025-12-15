# 🎯 GateV2 - Guia de Ajuste Rápido

## 🧠 Modelo Mental

**NÃO** tentamos classificar voz.  
**SIM** decidimos quando reagir.

O GateV2 combina 3 fatores para decidir:
1. **Energy Gate** (RMS) - Energia mínima
2. **Flux Gate** (Spectral Flux) - Mudança espectral mínima
3. **Min Sustain** - Tempo mínimo para confirmar (mata hits secos)

---

## 🎛️ Controles Disponíveis

### Energy Gate (0-0.08)
- **Default:** 0.018
- Energia mínima (RMS) necessária
- ⬇️ Diminuir: mais sensível a voz baixa
- ⬆️ Aumentar: menos sensível, ignora sussurros

### Flux Gate (0-3000)
- **Default:** 1200
- Mudança espectral mínima
- ⬆️ Aumentar: ignora mais instrumentos (1400-1600)
- ⬇️ Diminuir: mais sensível a mudanças sutis

### Min Sustain (0-200ms)
- **Default:** 50ms
- Tempo mínimo para ativar
- ⬆️ Aumentar: mata mais hits secos
- ⬇️ Diminuir: resposta mais rápida (ex: 30ms)

### Boost (0.5-6)
- **Default:** 2.2
- Amplificação da abertura da boca

---

## 🔧 Ajuste Rápido por Problema

### ❌ Ainda mexe com instrumental
```
✅ Aumentar Flux Gate: 1400 → 1600
```

### ❌ Não abre com voz baixa
```
✅ Diminuir Energy Gate: 0.016 → 0.014
```

### ❌ Abre tarde / Resposta lenta
```
✅ Diminuir Min Sustain: 50ms → 30ms
```

### ❌ Pisca demais (hits secos)
```
✅ Aumentar Min Sustain: 50ms → 80ms
✅ Aumentar Flux Gate: 1200 → 1400
```

### ❌ Boca muito aberta
```
✅ Diminuir Boost: 2.2 → 1.8
```

### ❌ Boca muito fechada
```
✅ Aumentar Boost: 2.2 → 2.8
```

---

## 🎵 Presets Sugeridos

### 🎤 Voz Solo (a cappella)
```typescript
energyGate: 0.014
fluxGate: 800
minSustain: 40
boost: 2.4
```

### 🎸 Voz + Instrumental Forte
```typescript
energyGate: 0.020
fluxGate: 1600
minSustain: 60
boost: 2.2
```

### 🎹 Voz + Piano/Acústico
```typescript
energyGate: 0.016
fluxGate: 1200
minSustain: 50
boost: 2.2
```

### 🥁 Voz + Bateria Pesada
```typescript
energyGate: 0.022
fluxGate: 1800
minSustain: 70
boost: 2.0
```

---

## 🧪 Debug Visual

O canvas mostra em tempo real:
- `open` - abertura da boca (0..1)
- `shape` - formato wide/round (0..1)
- `energyGate` - limiar de energia atual
- `fluxGate` - limiar de flux atual
- `boost` - amplificação atual
- `minSustain` - tempo mínimo (ms)
- **● GATE OPEN/CLOSED** - estado atual (verde/vermelho)
- `sustain` - tempo ativo atual (ms)

---

## 🚀 Uso Programático

```typescript
import { GateV2 } from "./audio/GateV2";

// Criar
const gate = new GateV2(analyser, {
  energyGate: 0.018,
  fluxGate: 1200,
  minSustain: 50,
  boost: 2.2
});

// Loop
const targetOpen = gate.update(dt);
const mouthOpen = envelope.update(targetOpen, dt);

// Ajustar em runtime
gate.setFluxGate(1500);
gate.setEnergyGate(0.016);
```

---

## 💡 Dica Pro

**Ordem de ajuste recomendada:**

1. Teste com valores default
2. Se pegar batida → ⬆️ Flux Gate (+200)
3. Se não abrir → ⬇️ Energy Gate (-0.002)
4. Se piscar → ⬆️ Min Sustain (+20ms)
5. Ajuste Boost por último (visual)

**Não mexa em tudo ao mesmo tempo!**  
Ajuste um parâmetro, teste, depois avance.
