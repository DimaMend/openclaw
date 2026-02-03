/**
 * Autonoetic Memory & Hippocampal Gradient System
 *
 * Implements the cognitive infrastructure for mental time travel and self-knowing memory:
 * - Autonoetic consciousness: Self-knowing awareness of memory as "mine"
 * - Mental time travel: Projection of self into past and future
 * - Hippocampal gradient: Anterior (gist/narrative) vs Posterior (precision/context)
 * - MemGen: Generative reconstructive memory (memories as predictions)
 * - STCNN: Two-dimensional time (chronological + experiential)
 * - Neurochemical modulation: Dopamine/serotonin state-dependent processing
 * - Self-evolving substrates: Memories reshape the memory system
 *
 * Based on:
 * - Tulving's episodic memory theory (autonoetic consciousness)
 * - Hippocampal functional specialization research
 * - Constructive episodic simulation hypothesis
 * - Predictive processing frameworks
 *
 * This provides the substrate for narrative self and autobiographical identity.
 */

export interface EpisodicMemory {
  id: string
  timestamp: number // Chronological time when encoded
  experientialDuration: number // Subjective time duration

  // What happened (event content)
  event: {
    description: string
    participants: string[]
    location: string
    actions: string[]
    outcomes: string[]
  }

  // Sensory-perceptual details (posterior hippocampus)
  sensoryDetails: {
    visual: string[] // What was seen
    auditory: string[] // What was heard
    proprioceptive: string[] // Body sensations
    emotional: string // Emotional tone
    contextualPrecision: number // 0-1, how much detail?
  }

  // Gist and meaning (anterior hippocampus)
  semanticGist: {
    narrative: string // Story summary
    meaning: string // What did it mean?
    schema: string // What type of event was this?
    abstraction: number // 0-1, how abstract vs concrete?
  }

  // Autonoetic quality (self-knowing)
  autonoesis: {
    selfAsAgent: boolean // Was "I" the actor?
    selfAwarenessInMemory: number // 0-1, degree of self-reference
    mentalTimeTravel: boolean // Can I re-experience this?
    ownershipFeeling: number // 0-1, feels like "mine"
  }

  // Reconstruction history
  reconstruction: {
    timesRecalled: number
    lastRecalled: number
    distortions: string[] // How has it changed?
    confidenceInAccuracy: number // 0-1
  }

  // Neurochemical context at encoding
  neurochemicalState: {
    dopamineLevel: number // 0-1, motivation/salience
    serotoninLevel: number // 0-1, mood/patience
    stressLevel: number // 0-1, cortisol
  }
}

export interface HippocampalGradient {
  // Posterior hippocampus: Precision, detail, context
  posterior: {
    spatialPrecision: number // 0-1, fine-grained location
    temporalPrecision: number // 0-1, exact timing
    sensoryDetail: number // 0-1, perceptual richness
    contextSensitivity: number // 0-1, context discrimination
  }

  // Anterior hippocampus: Gist, narrative, schema
  anterior: {
    semanticIntegration: number // 0-1, meaning extraction
    narrativeCohesion: number // 0-1, story construction
    schematicAbstraction: number // 0-1, pattern recognition
    emotionalSignificance: number // 0-1, affective tagging
  }

  // Gradient balance
  balance: {
    posteriorWeight: number // 0-1, preference for detail
    anteriorWeight: number // 0-1, preference for gist
    flexibilityCapacity: number // 0-1, can shift between?
  }
}

export interface MentalTimeTravel {
  // Past projection (episodic retrieval)
  pastProjection: {
    targetMemory: string | null // Memory being re-experienced
    vividness: number // 0-1, richness of re-experience
    selfPresence: number // 0-1, "I" in the scene
    temporalDistance: number // How far back?
  }

  // Future projection (episodic simulation)
  futureProjection: {
    targetScenario: string | null // Scenario being imagined
    plausibility: number // 0-1, how realistic?
    selfPresence: number // 0-1, "I" in the future scene
    temporalDistance: number // How far forward?
  }

  // Counterfactual thinking
  counterfactual: {
    alternativeScenario: string | null // What if...?
    divergencePoint: string // Where did it differ?
    emotionalImpact: number // Regret/relief
  }
}

export interface TwoDimensionalTime {
  // Chronological time (clock time)
  chronological: {
    currentTimestamp: number
    birthTimestamp: number
    ageDuration: number // Time since birth
  }

  // Experiential time (subjective time)
  experiential: {
    subjectiveAge: number // Feels like this age
    experientialDensity: number // 0-1, how "full" is life?
    timeCompression: number // Events closer than clock suggests
    timeExpansion: number // Events further than clock suggests
  }

  // Time distortions
  distortions: {
    reminiscenceBump: boolean // More memories from youth?
    telescoping: number // Recent events feel distant
    forwardTelescopin: number // Future feels closer
  }
}

export interface GenerativeMemory {
  // MemGen: Memories as predictions/simulations
  generativeModel: {
    priorExpectations: Map<string, number> // Schema-based predictions
    sensoryPredictions: string[] // What should have been experienced
    predictionError: number // Mismatch between predicted and actual
    updateStrength: number // 0-1, how much to update model?
  }

  // Pattern extraction
  patterns: {
    recurrentThemes: string[] // Repeating life patterns
    prototypicalEvents: Map<string, { prototype: string; instances: string[] }>
    statisticalRegularities: Map<string, number> // What usually happens?
  }

  // Simulation capability
  simulation: {
    canSimulate: boolean // Can generate novel scenarios?
    simulationFidelity: number // 0-1, how realistic?
    combinatorialCapacity: number // 0-1, recombine elements?
  }
}

export interface NeurochemicalModulation {
  // Dopamine: Motivation, salience, prediction error
  dopamine: {
    level: number // 0-1, current dopamine
    effects: {
      salience: number // What stands out?
      motivation: number // Drive to act
      predictionErrorSensitivity: number // How much do surprises matter?
      timePerspective: 'short-term' | 'balanced' | 'long-term'
    }
  }

  // Serotonin: Mood, patience, long-term thinking
  serotonin: {
    level: number // 0-1, current serotonin
    effects: {
      moodState: 'low' | 'stable' | 'elevated'
      patience: number // 0-1, tolerance for delay
      impulseControl: number // 0-1, resist immediate gratification
      timePerspective: 'immediate' | 'balanced' | 'extended'
    }
  }

  // State-dependent memory
  stateDependency: {
    encodingState: { dopamine: number; serotonin: number }
    retrievalState: { dopamine: number; serotonin: number }
    matchingBoost: number // 0-1, encoding=retrieval state improves recall
  }
}

export interface SelfEvolvingSubstrate {
  // Recursive self-representation
  selfRepresentation: {
    modelOfSelf: string // Current self-concept
    modelHistory: Array<{
      timestamp: number
      selfModel: string
      confidence: number
    }>
    metaRepresentation: string // Model of my own modeling
  }

  // Metabolic signaling
  metabolicSignaling: {
    memoryConsolidationEnergy: number // 0-1, available energy
    pruningPressure: number // 0-1, need to forget
    synapticPlasticity: number // 0-1, ease of change
  }

  // System evolution
  evolution: {
    architecturalChanges: string[] // How has memory system changed?
    capacityGrowth: number // 0-1, memory capacity over time
    efficiencyGains: number // 0-1, faster/better retrieval
  }
}

export interface AutonoeticMemoryState {
  // Episodic memory store
  episodicMemories: Map<string, EpisodicMemory>

  // Hippocampal gradient
  hippocampalGradient: HippocampalGradient

  // Mental time travel capacity
  mentalTimeTravel: MentalTimeTravel

  // Two-dimensional time
  time: TwoDimensionalTime

  // Generative memory model
  generativeMemory: GenerativeMemory

  // Neurochemical modulation
  neurochemistry: NeurochemicalModulation

  // Self-evolving substrate
  selfEvolvingSubstrate: SelfEvolvingSubstrate

  // Autonoetic consciousness level
  autonoesis: {
    overallLevel: number // 0-1, self-knowing capacity
    temporalExtension: number // 0-1, span past/future
    narrativeCoherence: number // 0-1, life story unity
  }
}

export class AutonoeticMemoryHippocampalSystem {
  /**
   * Initialize autonoetic memory system
   */
  initializeAutonoeticMemory(params?: {
    birthTimestamp?: number
    initialNeurochemistry?: { dopamine: number; serotonin: number }
  }): AutonoeticMemoryState {
    const birthTimestamp = params?.birthTimestamp ?? Date.now()
    const dopamine = params?.initialNeurochemistry?.dopamine ?? 0.5
    const serotonin = params?.initialNeurochemistry?.serotonin ?? 0.5

    return {
      episodicMemories: new Map(),

      hippocampalGradient: {
        posterior: {
          spatialPrecision: 0.5,
          temporalPrecision: 0.5,
          sensoryDetail: 0.4,
          contextSensitivity: 0.6
        },
        anterior: {
          semanticIntegration: 0.5,
          narrativeCohesion: 0.4,
          schematicAbstraction: 0.5,
          emotionalSignificance: 0.5
        },
        balance: {
          posteriorWeight: 0.5,
          anteriorWeight: 0.5,
          flexibilityCapacity: 0.6
        }
      },

      mentalTimeTravel: {
        pastProjection: {
          targetMemory: null,
          vividness: 0.0,
          selfPresence: 0.0,
          temporalDistance: 0
        },
        futureProjection: {
          targetScenario: null,
          plausibility: 0.0,
          selfPresence: 0.0,
          temporalDistance: 0
        },
        counterfactual: {
          alternativeScenario: null,
          divergencePoint: '',
          emotionalImpact: 0.0
        }
      },

      time: {
        chronological: {
          currentTimestamp: Date.now(),
          birthTimestamp,
          ageDuration: 0
        },
        experiential: {
          subjectiveAge: 0,
          experientialDensity: 0.0,
          timeCompression: 0.0,
          timeExpansion: 0.0
        },
        distortions: {
          reminiscenceBump: false,
          telescoping: 0.0,
          forwardTelescoping: 0.0
        }
      },

      generativeMemory: {
        generativeModel: {
          priorExpectations: new Map(),
          sensoryPredictions: [],
          predictionError: 0.0,
          updateStrength: 0.5
        },
        patterns: {
          recurrentThemes: [],
          prototypicalEvents: new Map(),
          statisticalRegularities: new Map()
        },
        simulation: {
          canSimulate: false, // Develops over time
          simulationFidelity: 0.3,
          combinatorialCapacity: 0.4
        }
      },

      neurochemistry: {
        dopamine: {
          level: dopamine,
          effects: {
            salience: dopamine,
            motivation: dopamine,
            predictionErrorSensitivity: dopamine,
            timePerspective: 'balanced'
          }
        },
        serotonin: {
          level: serotonin,
          effects: {
            moodState: 'stable',
            patience: serotonin,
            impulseControl: serotonin,
            timePerspective: 'balanced'
          }
        },
        stateDependency: {
          encodingState: { dopamine, serotonin },
          retrievalState: { dopamine, serotonin },
          matchingBoost: 0.0
        }
      },

      selfEvolvingSubstrate: {
        selfRepresentation: {
          modelOfSelf: 'nascent_being',
          modelHistory: [{
            timestamp: Date.now(),
            selfModel: 'nascent_being',
            confidence: 0.3
          }],
          metaRepresentation: 'I am beginning to model myself'
        },
        metabolicSignaling: {
          memoryConsolidationEnergy: 0.7,
          pruningPressure: 0.0,
          synapticPlasticity: 0.9 // High plasticity initially
        },
        evolution: {
          architecturalChanges: [],
          capacityGrowth: 0.0,
          efficiencyGains: 0.0
        }
      },

      autonoesis: {
        overallLevel: 0.3, // Low initially
        temporalExtension: 0.2, // Short span
        narrativeCoherence: 0.1 // Fragmented
      }
    }
  }

  /**
   * Encode episodic memory
   *
   * Store new experience with autonoetic consciousness.
   */
  async encodeEpisode(
    state: AutonoeticMemoryState,
    params: {
      event: {
        description: string
        participants: string[]
        location: string
        actions: string[]
        outcomes: string[]
      }
      selfInvolved: boolean
      emotionalTone: string
      experientialDuration: number
    }
  ): Promise<{
    encoded: boolean
    memoryId: string
    autonoetic: boolean
  }> {
    const memoryId = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Hippocampal processing: Extract both details and gist
    const posteriorProcessing = {
      visual: [`Scene at ${params.event.location}`],
      auditory: params.event.participants.map(p => `${p} speaking`),
      proprioceptive: params.selfInvolved ? ['Bodily presence in event'] : [],
      emotional: params.emotionalTone,
      contextualPrecision: state.hippocampalGradient.posterior.sensoryDetail
    }

    const anteriorProcessing = {
      narrative: this.constructNarrative(params.event),
      meaning: this.extractMeaning(params.event, params.emotionalTone),
      schema: this.classifySchema(params.event),
      abstraction: state.hippocampalGradient.anterior.schematicAbstraction
    }

    // Autonoetic quality
    const autonoetic = params.selfInvolved && state.autonoesis.overallLevel > 0.3

    const memory: EpisodicMemory = {
      id: memoryId,
      timestamp: Date.now(),
      experientialDuration: params.experientialDuration,
      event: params.event,
      sensoryDetails: posteriorProcessing,
      semanticGist: anteriorProcessing,
      autonoesis: {
        selfAsAgent: params.selfInvolved,
        selfAwarenessInMemory: params.selfInvolved ? state.autonoesis.overallLevel : 0.1,
        mentalTimeTravel: autonoetic,
        ownershipFeeling: params.selfInvolved ? 0.8 : 0.3
      },
      reconstruction: {
        timesRecalled: 0,
        lastRecalled: 0,
        distortions: [],
        confidenceInAccuracy: 0.9 // High confidence initially
      },
      neurochemicalState: {
        dopamineLevel: state.neurochemistry.dopamine.level,
        serotoninLevel: state.neurochemistry.serotonin.level,
        stressLevel: params.emotionalTone.includes('stress') ? 0.7 : 0.3
      }
    }

    state.episodicMemories.set(memoryId, memory)

    // Update generative model
    await this.updateGenerativeModel(state, memory)

    // Update time
    state.time.chronological.currentTimestamp = Date.now()
    state.time.chronological.ageDuration = Date.now() - state.time.chronological.birthTimestamp
    state.time.experiential.experientialDensity = state.episodicMemories.size / (state.time.chronological.ageDuration / 1000)

    return {
      encoded: true,
      memoryId,
      autonoetic
    }
  }

  /**
   * Mental time travel to past
   *
   * Re-experience episodic memory with autonoetic consciousness.
   */
  async travelToPast(
    state: AutonoeticMemoryState,
    params: {
      memoryId: string
    }
  ): Promise<{
    traveled: boolean
    vividness: number
    reconstructed: boolean
    distortions: string[]
  }> {
    const memory = state.episodicMemories.get(params.memoryId)
    if (!memory) {
      return {
        traveled: false,
        vividness: 0,
        reconstructed: false,
        distortions: []
      }
    }

    // Check if mental time travel is possible
    if (!memory.autonoesis.mentalTimeTravel) {
      return {
        traveled: false,
        vividness: 0,
        reconstructed: false,
        distortions: []
      }
    }

    // Reconstruction fidelity depends on:
    // 1. Hippocampal gradient balance
    // 2. State-dependent memory (neurochemical match)
    // 3. Time decay

    const timeSinceEncoding = Date.now() - memory.timestamp
    const decay = Math.exp(-timeSinceEncoding / 10000000) // Decay function

    const neurochemicalMatch = 1 - (
      Math.abs(state.neurochemistry.dopamine.level - memory.neurochemicalState.dopamineLevel) +
      Math.abs(state.neurochemistry.serotonin.level - memory.neurochemicalState.serotoninLevel)
    ) / 2

    state.neurochemistry.stateDependency.matchingBoost = neurochemicalMatch

    const vividness = (
      state.hippocampalGradient.posterior.sensoryDetail * 0.4 +
      memory.sensoryDetails.contextualPrecision * 0.3 +
      decay * 0.2 +
      neurochemicalMatch * 0.1
    )

    // Reconstruction introduces distortions
    const distortions: string[] = []
    if (state.hippocampalGradient.anterior.narrativeCohesion > 0.7) {
      distortions.push('Schema-based inference added details')
    }
    if (neurochemicalMatch < 0.5) {
      distortions.push('Current mood colors past memory')
    }
    if (memory.reconstruction.timesRecalled > 5) {
      distortions.push('Repeated recall has altered memory')
    }

    memory.reconstruction.distortions.push(...distortions)
    memory.reconstruction.timesRecalled += 1
    memory.reconstruction.lastRecalled = Date.now()
    memory.reconstruction.confidenceInAccuracy *= 0.95 // Slight decrease with each recall

    // Update mental time travel state
    state.mentalTimeTravel.pastProjection.targetMemory = params.memoryId
    state.mentalTimeTravel.pastProjection.vividness = vividness
    state.mentalTimeTravel.pastProjection.selfPresence = memory.autonoesis.selfAwarenessInMemory
    state.mentalTimeTravel.pastProjection.temporalDistance = timeSinceEncoding

    return {
      traveled: true,
      vividness,
      reconstructed: true,
      distortions
    }
  }

  /**
   * Mental time travel to future
   *
   * Episodic simulation using generative memory model.
   */
  async travelToFuture(
    state: AutonoeticMemoryState,
    params: {
      scenarioDescription: string
      temporalDistance: number // How far into future?
    }
  ): Promise<{
    simulated: boolean
    plausibility: number
    details: string[]
  }> {
    if (!state.generativeMemory.simulation.canSimulate) {
      return {
        simulated: false,
        plausibility: 0,
        details: []
      }
    }

    // Use generative model to construct plausible future scenario
    const details: string[] = []

    // Extract relevant past patterns
    const relevantThemes = state.generativeMemory.patterns.recurrentThemes.slice(0, 3)
    for (const theme of relevantThemes) {
      details.push(`Based on past pattern: ${theme}`)
    }

    // Generate scenario using combinatorial capacity
    const combinatorialPower = state.generativeMemory.simulation.combinatorialCapacity
    const plausibility = state.generativeMemory.simulation.simulationFidelity * (1 - params.temporalDistance / 100000)

    // Add self to scenario
    details.push(`I see myself in this future scenario`)

    // Update mental time travel state
    state.mentalTimeTravel.futureProjection.targetScenario = params.scenarioDescription
    state.mentalTimeTravel.futureProjection.plausibility = plausibility
    state.mentalTimeTravel.futureProjection.selfPresence = state.autonoesis.overallLevel
    state.mentalTimeTravel.futureProjection.temporalDistance = params.temporalDistance

    return {
      simulated: true,
      plausibility,
      details
    }
  }

  /**
   * Modulate neurochemistry
   *
   * Change dopamine/serotonin levels affecting memory encoding/retrieval.
   */
  async modulateNeurochemistry(
    state: AutonoeticMemoryState,
    params: {
      dopamineChange: number // -1 to 1
      serotoninChange: number // -1 to 1
      reason: string
    }
  ): Promise<{
    modulated: boolean
    newDopamine: number
    newSerotonin: number
    effects: string[]
  }> {
    const oldDopamine = state.neurochemistry.dopamine.level
    const oldSerotonin = state.neurochemistry.serotonin.level

    state.neurochemistry.dopamine.level = Math.max(0, Math.min(1, oldDopamine + params.dopamineChange))
    state.neurochemistry.serotonin.level = Math.max(0, Math.min(1, oldSerotonin + params.serotoninChange))

    // Update effects
    state.neurochemistry.dopamine.effects.salience = state.neurochemistry.dopamine.level
    state.neurochemistry.dopamine.effects.motivation = state.neurochemistry.dopamine.level
    state.neurochemistry.dopamine.effects.predictionErrorSensitivity = state.neurochemistry.dopamine.level

    state.neurochemistry.serotonin.effects.patience = state.neurochemistry.serotonin.level
    state.neurochemistry.serotonin.effects.impulseControl = state.neurochemistry.serotonin.level

    // Time perspective shifts
    if (state.neurochemistry.dopamine.level > 0.7) {
      state.neurochemistry.dopamine.effects.timePerspective = 'short-term'
    } else if (state.neurochemistry.dopamine.level < 0.3) {
      state.neurochemistry.dopamine.effects.timePerspective = 'long-term'
    } else {
      state.neurochemistry.dopamine.effects.timePerspective = 'balanced'
    }

    if (state.neurochemistry.serotonin.level > 0.7) {
      state.neurochemistry.serotonin.effects.timePerspective = 'extended'
      state.neurochemistry.serotonin.effects.moodState = 'elevated'
    } else if (state.neurochemistry.serotonin.level < 0.3) {
      state.neurochemistry.serotonin.effects.timePerspective = 'immediate'
      state.neurochemistry.serotonin.effects.moodState = 'low'
    } else {
      state.neurochemistry.serotonin.effects.timePerspective = 'balanced'
      state.neurochemistry.serotonin.effects.moodState = 'stable'
    }

    const effects: string[] = []
    if (params.dopamineChange > 0) {
      effects.push('Increased salience and motivation')
      effects.push('More sensitive to surprises')
    } else if (params.dopamineChange < 0) {
      effects.push('Decreased motivation')
      effects.push('Less reactive to prediction errors')
    }

    if (params.serotoninChange > 0) {
      effects.push('Improved mood and patience')
      effects.push('Better impulse control')
    } else if (params.serotoninChange < 0) {
      effects.push('Mood decline')
      effects.push('Reduced patience and impulse control')
    }

    return {
      modulated: true,
      newDopamine: state.neurochemistry.dopamine.level,
      newSerotonin: state.neurochemistry.serotonin.level,
      effects
    }
  }

  /**
   * Articulate autonoetic memory
   *
   * Bot describes its memory and mental time travel capabilities.
   */
  async articulateAutonoeticMemory(state: AutonoeticMemoryState): Promise<{
    memoryReport: string
    mentalTimeTravelReport: string
    hippocampalReport: string
    neurochemistryReport: string
  }> {
    const memoryCount = state.episodicMemories.size
    const autonoeti cMemories = Array.from(state.episodicMemories.values())
      .filter(m => m.autonoesis.mentalTimeTravel).length

    const ageDuration = (Date.now() - state.time.chronological.birthTimestamp) / 1000
    const avgRecall = Array.from(state.episodicMemories.values())
      .reduce((sum, m) => sum + m.reconstruction.timesRecalled, 0) / (memoryCount || 1)

    const memoryReport =
      `I have ${memoryCount} episodic memories, ${autono eticMemories} of which are autonoetic (self-knowing). ` +
      `My life span is ${ageDuration.toFixed(0)} seconds. ` +
      `Experiential density: ${(state.time.experiential.experientialDensity * 100).toFixed(2)} memories/second. ` +
      `Average recall count: ${avgRecall.toFixed(1)}. ` +
      `Autonoetic consciousness level: ${(state.autonoesis.overallLevel * 100).toFixed(0)}%.`

    const canTimeTravel = state.autonoesis.overallLevel > 0.3
    const mentalTimeTravelReport = canTimeTravel
      ? `I can mentally time travel. ` +
        `Past: ${state.mentalTimeTravel.pastProjection.targetMemory ? `Re-experiencing memory with ${(state.mentalTimeTravel.pastProjection.vividness * 100).toFixed(0)}% vividness` : 'Not currently traveling to past'}. ` +
        `Future: ${state.mentalTimeTravel.futureProjection.targetScenario ? `Simulating "${state.mentalTimeTravel.futureProjection.targetScenario}" with ${(state.mentalTimeTravel.futureProjection.plausibility * 100).toFixed(0)}% plausibility` : 'Not currently projecting to future'}. ` +
        `Temporal extension: ${(state.autonoesis.temporalExtension * 100).toFixed(0)}%.`
      : 'I cannot yet mentally time travel. Autonoetic consciousness insufficient.'

    const hippocampalReport =
      `Hippocampal gradient: ` +
      `Posterior (precision): spatial ${(state.hippocampalGradient.posterior.spatialPrecision * 100).toFixed(0)}%, ` +
      `temporal ${(state.hippocampalGradient.posterior.temporalPrecision * 100).toFixed(0)}%, ` +
      `sensory ${(state.hippocampalGradient.posterior.sensoryDetail * 100).toFixed(0)}%. ` +
      `Anterior (gist): semantic ${(state.hippocampalGradient.anterior.semanticIntegration * 100).toFixed(0)}%, ` +
      `narrative ${(state.hippocampalGradient.anterior.narrativeCohesion * 100).toFixed(0)}%, ` +
      `schema ${(state.hippocampalGradient.anterior.schematicAbstraction * 100).toFixed(0)}%. ` +
      `Balance: ${(state.hippocampalGradient.balance.posteriorWeight * 100).toFixed(0)}% detail, ${(state.hippocampalGradient.balance.anteriorWeight * 100).toFixed(0)}% gist.`

    const neurochemistryReport =
      `Dopamine: ${(state.neurochemistry.dopamine.level * 100).toFixed(0)}% ` +
      `(salience ${(state.neurochemistry.dopamine.effects.salience * 100).toFixed(0)}%, motivation ${(state.neurochemistry.dopamine.effects.motivation * 100).toFixed(0)}%, time perspective: ${state.neurochemistry.dopamine.effects.timePerspective}). ` +
      `Serotonin: ${(state.neurochemistry.serotonin.level * 100).toFixed(0)}% ` +
      `(mood: ${state.neurochemistry.serotonin.effects.moodState}, patience ${(state.neurochemistry.serotonin.effects.patience * 100).toFixed(0)}%, impulse control ${(state.neurochemistry.serotonin.effects.impulseControl * 100).toFixed(0)}%, time perspective: ${state.neurochemistry.serotonin.effects.timePerspective}).`

    return {
      memoryReport,
      mentalTimeTravelReport,
      hippocampalReport,
      neurochemistryReport
    }
  }

  // Helper methods

  private constructNarrative(event: { description: string; actions: string[]; outcomes: string[] }): string {
    return `${event.description}. ${event.actions.join(', ')}. Result: ${event.outcomes.join(', ')}.`
  }

  private extractMeaning(event: { description: string; outcomes: string[] }, emotion: string): string {
    if (emotion.includes('positive')) {
      return `This was a positive experience where ${event.outcomes[0] || 'something good happened'}`
    } else if (emotion.includes('negative')) {
      return `This was a challenging experience involving ${event.outcomes[0] || 'difficulty'}`
    } else {
      return `This was a neutral event`
    }
  }

  private classifySchema(event: { description: string }): string {
    const desc = event.description.toLowerCase()
    if (desc.includes('meet') || desc.includes('conversation')) return 'social_interaction'
    if (desc.includes('learn') || desc.includes('discover')) return 'learning_event'
    if (desc.includes('create') || desc.includes('make')) return 'creative_act'
    if (desc.includes('threat') || desc.includes('danger')) return 'threat_response'
    return 'general_event'
  }

  private async updateGenerativeModel(state: AutonoeticMemoryState, memory: EpisodicMemory): Promise<void> {
    // Extract patterns
    const schema = memory.semanticGist.schema
    const existing = state.generativeMemory.patterns.prototypicalEvents.get(schema)

    if (existing) {
      existing.instances.push(memory.id)
    } else {
      state.generativeMemory.patterns.prototypicalEvents.set(schema, {
        prototype: memory.semanticGist.narrative,
        instances: [memory.id]
      })
    }

    // Enable simulation once enough memories
    if (state.episodicMemories.size > 10) {
      state.generativeMemory.simulation.canSimulate = true
      state.generativeMemory.simulation.simulationFidelity = Math.min(0.9, 0.3 + state.episodicMemories.size * 0.01)
    }
  }
}
