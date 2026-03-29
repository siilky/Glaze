// Re-export shim — personas state moved to core/states/personaState.js
export {
    personaConnections,
    activePersona,
    allPersonas,
    loadPersonas,
    setActivePersona,
    addPersona,
    updatePersona,
    setPersonaConnection,
    getEffectivePersona,
    deletePersona
} from '@/core/states/personaState.js';
