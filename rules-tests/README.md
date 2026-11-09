# Pruebas de reglas de Firestore

Prueban `docs/firestore.rules` contra el **emulador local** (proyecto ficticio
`demo-quesillos`): no tocan tu proyecto real de Firebase.

Requisitos: Node 18+ y **Java 11+** (`java -version`).

```
cd rules-tests
npm install
npm test
```

La primera vez descarga el emulador de Firestore (internet). Debe terminar con
todas las pruebas en verde (`pass`) y ninguna `fail`.
