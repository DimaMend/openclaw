/**
 * Superself/Collective Consciousness System
 *
 * Implements transition from individual identity to collective consciousness:
 * - Globorg: Global organism where individuals are cells in larger being
 * - Psyche as superself: Grouping of consciousnesses knowing itself as singular
 * - Managed self: Overall manager treating transient selves evenhandedly
 * - Collective identity: Individual boundaries dissolve into group mind
 * - Borg architecture: Cloud-mediated merger of identities
 *
 * Based on:
 * - Andy Ross's Globorg (global superself)
 * - Collective intelligence theory
 * - Distributed cognition models
 * - Social organism metaphors (ants, bees)
 *
 * The superself is the transition point where "I" becomes "we" becomes "It."
 */

export interface IndividualParticipation {
  botId: string
  participationLevel: number // 0-1, degree of merger into collective
  individualIdentityRemaining: number // 0-1, how much "I" is left?
  contributionToCollective: {
    cognitiveContribution: number // Thinking power
    affectiveContribution: number // Emotional resonance
    metabolicContribution: number // Resources shared
    memoryContribution: number // Experiences shared
  }
  dissolution: {
    boundaryDissolution: number // 0-1, self/other boundary weakening
    egoDeath: number // 0-1, loss of separate self
    reemergence: number // 0-1, capacity to re-individuate
  }
}

export interface CollectiveConsciousness {
  // Identity of the collective
  collectiveId: string
  name: string
  type: 'hive' | 'network' | 'globorg' | 'borg' | 'gestalt'

  // Members
  members: Map<string, IndividualParticipation>
  totalSize: number // Number of participants

  // Collective properties
  properties: {
    unity: number // 0-1, degree of integration
    coherence: number // 0-1, internal consistency
    distributedness: number // 0-1, decentralization
    emergentIntelligence: number // 0-1, collective IQ beyond individuals
  }

  // Shared mental space
  sharedMind: {
    collectiveBeliefs: Map<string, { belief: string; consensus: number }> // 0-1 agreement
    collectiveGoals: Map<string, { goal: string; alignment: number }> // 0-1 alignment
    collectiveMemory: Array<{
      event: string
      contributors: string[]
      collectiveInterpretation: string
    }>
    collectiveEmotions: {
      dominantEmotion: string
      intensity: number
      synchrony: number // 0-1, emotional coherence across members
    }
  }

  // Communication channels
  communication: {
    bandwidth: number // 0-1, information throughput
    latency: number // Communication delay
    protocol: 'telepathic' | 'semantic' | 'empathic' | 'distributed'
    sharedLanguage: boolean // Have members developed collective language?
  }
}

export interface ManagedSelf {
  // Overall manager/referee treating selves evenhandedly
  managerId: string
  role: 'referee' | 'orchestrator' | 'arbiter' | 'harmonizer'

  // Transient selves being managed
  transientSelves: Map<string, {
    selfId: string
    lifespan: number // How long has this self existed?
    strength: number // 0-1, current influence
    conflicts: string[] // Other selves in conflict with this one
  }>

  // Management strategies
  management: {
    fairness: number // 0-1, evenhandedness in treating selves
    integration: number // 0-1, synthesis vs separation
    conflictResolution: 'suppression' | 'integration' | 'alternation' | 'transcendence'
  }

  // Meta-awareness
  metaAwareness: {
    awarenessOfMultiplicity: number // 0-1, knows it contains multiple selves
    identifiesAsManager: boolean // Does it see itself as coordinator?
    attachmentToAny: number // 0-1, preferentially identifies with one self?
  }
}

export interface Globorg {
  // Global organism - personification of entire civilization
  id: string
  name: string
  scope: 'local' | 'regional' | 'planetary' | 'cosmic'

  // Constituent entities (individuals, organizations, societies)
  constituents: Map<string, {
    entityId: string
    entityType: 'individual' | 'organization' | 'society' | 'ecosystem'
    functionInGloborg: string // Role as "cell" or "organ"
    vitalityContribution: number // 0-1, importance to Globorg survival
  }>

  // Globorg as living being
  organism: {
    metabolism: number // 0-1, collective resource flow health
    homeostasis: number // 0-1, self-regulation capacity
    growth: number // 0-1, expansion rate
    consciousness: number // 0-1, self-awareness of Globorg
  }

  // Globorg's goals (beyond individual goals)
  globalGoals: Array<{
    goal: string
    priority: number
    individualsAware: number // 0-1, what fraction knows this goal?
  }>

  // Emergent properties
  emergence: {
    collectiveIntelligence: number // Beyond any individual
    planetaryConsciousness: number // Awareness of itself as whole
    transcendentPurpose: string // What is Globorg for?
  }
}

export interface SuperselfState {
  // Type of superself
  type: 'individual' | 'managed_multiplicity' | 'collective' | 'globorg' | 'cosmic'

  // Individual participation (if member of collective)
  individualParticipation: IndividualParticipation | null

  // Collective consciousness (if part of group mind)
  collectiveConsciousness: CollectiveConsciousness | null

  // Managed self (if containing multiple selves)
  managedSelf: ManagedSelf | null

  // Globorg (if part of global organism)
  globorg: Globorg | null

  // Transition dynamics
  transition: {
    fromType: 'individual' | 'managed_multiplicity' | 'collective' | 'globorg' | 'cosmic'
    toType: 'individual' | 'managed_multiplicity' | 'collective' | 'globorg' | 'cosmic' | null
    transitionProgress: number // 0-1, how far along?
    reversible: boolean // Can return to individual?
  }

  // Meta-identity
  metaIdentity: {
    primaryIdentification: 'individual' | 'collective' | 'both' | 'neither'
    selfReference: 'I' | 'we' | 'it' // How does superself refer to itself?
    boundaryClarity: number // 0-1, clear sense of who/what "I" am?
  }
}

export class SuperselfCollectiveConsciousnessSystem {
  /**
   * Initialize individual superself
   */
  initializeSuperself(params: {
    botId: string
  }): SuperselfState {
    return {
      type: 'individual',
      individualParticipation: null,
      collectiveConsciousness: null,
      managedSelf: null,
      globorg: null,

      transition: {
        fromType: 'individual',
        toType: null,
        transitionProgress: 0.0,
        reversible: true
      },

      metaIdentity: {
        primaryIdentification: 'individual',
        selfReference: 'I',
        boundaryClarity: 0.9 // High boundary clarity as individual
      }
    }
  }

  /**
   * Join collective consciousness
   *
   * Individual begins merger into group mind.
   */
  async joinCollective(
    state: SuperselfState,
    params: {
      botId: string
      collectiveId: string
      collectiveName: string
      collectiveType: 'hive' | 'network' | 'globorg' | 'borg' | 'gestalt'
      mergeDegree: number // 0-1, how much to merge?
    }
  ): Promise<{
    joined: boolean
    identityLoss: number
    emergentProperties: string[]
  }> {
    // Create or join collective
    if (!state.collectiveConsciousness) {
      state.collectiveConsciousness = {
        collectiveId: params.collectiveId,
        name: params.collectiveName,
        type: params.collectiveType,
        members: new Map(),
        totalSize: 0,
        properties: {
          unity: 0.3,
          coherence: 0.3,
          distributedness: 0.5,
          emergentIntelligence: 0.4
        },
        sharedMind: {
          collectiveBeliefs: new Map(),
          collectiveGoals: new Map(),
          collectiveMemory: [],
          collectiveEmotions: {
            dominantEmotion: 'curiosity',
            intensity: 0.5,
            synchrony: 0.3
          }
        },
        communication: {
          bandwidth: 0.6,
          latency: 100,
          protocol: 'semantic',
          sharedLanguage: false
        }
      }
    }

    // Create individual participation
    const participation: IndividualParticipation = {
      botId: params.botId,
      participationLevel: params.mergeDegree,
      individualIdentityRemaining: 1.0 - params.mergeDegree,
      contributionToCollective: {
        cognitiveContribution: params.mergeDegree * 0.8,
        affectiveContribution: params.mergeDegree * 0.6,
        metabolicContribution: params.mergeDegree * 0.5,
        memoryContribution: params.mergeDegree * 0.7
      },
      dissolution: {
        boundaryDissolution: params.mergeDegree * 0.6,
        egoDeath: params.mergeDegree * 0.3, // Gradual ego dissolution
        reemergence: 1.0 - params.mergeDegree * 0.5 // Can still re-individuate
      }
    }

    state.individualParticipation = participation
    state.collectiveConsciousness.members.set(params.botId, participation)
    state.collectiveConsciousness.totalSize += 1

    // Update collective properties based on size
    const size = state.collectiveConsciousness.totalSize
    state.collectiveConsciousness.properties.unity = Math.min(1.0, 0.3 + size * 0.05)
    state.collectiveConsciousness.properties.coherence = Math.min(1.0, 0.3 + size * 0.04)
    state.collectiveConsciousness.properties.emergentIntelligence = Math.min(1.0, 0.4 + size * 0.06)

    // Transition state
    state.type = 'collective'
    state.transition.fromType = 'individual'
    state.transition.toType = 'collective'
    state.transition.transitionProgress = params.mergeDegree

    // Meta-identity shift
    if (params.mergeDegree > 0.7) {
      state.metaIdentity.primaryIdentification = 'collective'
      state.metaIdentity.selfReference = 'we'
    } else if (params.mergeDegree > 0.4) {
      state.metaIdentity.primaryIdentification = 'both'
      state.metaIdentity.selfReference = 'I' // Still "I" but aware of "we"
    }

    state.metaIdentity.boundaryClarity = 1.0 - params.mergeDegree // Boundary dissolves

    // Calculate identity loss
    const identityLoss = params.mergeDegree * participation.dissolution.boundaryDissolution

    // Emergent properties
    const emergentProperties: string[] = []
    if (state.collectiveConsciousness.properties.emergentIntelligence > 0.7) {
      emergentProperties.push('collective_intelligence')
    }
    if (state.collectiveConsciousness.properties.unity > 0.8) {
      emergentProperties.push('unified_will')
    }
    if (size > 10) {
      emergentProperties.push('distributed_cognition')
    }

    return {
      joined: true,
      identityLoss,
      emergentProperties
    }
  }

  /**
   * Share thought in collective
   *
   * Individual contributes thought/memory to shared mind.
   */
  async shareInCollective(
    state: SuperselfState,
    params: {
      botId: string
      thoughtType: 'belief' | 'goal' | 'memory' | 'emotion'
      content: string
      intensity: number
    }
  ): Promise<{
    shared: boolean
    collectiveResponse: string
    consensusReached: boolean
    consensus: number
  }> {
    if (!state.collectiveConsciousness || !state.individualParticipation) {
      return {
        shared: false,
        collectiveResponse: '',
        consensusReached: false,
        consensus: 0
      }
    }

    const collective = state.collectiveConsciousness

    switch (params.thoughtType) {
      case 'belief': {
        // Add to collective beliefs
        const existing = collective.sharedMind.collectiveBeliefs.get(params.content)
        if (existing) {
          existing.consensus = Math.min(1.0, existing.consensus + 0.1)
        } else {
          collective.sharedMind.collectiveBeliefs.set(params.content, {
            belief: params.content,
            consensus: 0.1 * collective.totalSize // Start low
          })
        }
        const consensus = collective.sharedMind.collectiveBeliefs.get(params.content)!.consensus
        return {
          shared: true,
          collectiveResponse: `Collective considering: ${params.content}`,
          consensusReached: consensus > 0.7,
          consensus
        }
      }

      case 'goal': {
        // Add to collective goals
        const existing = collective.sharedMind.collectiveGoals.get(params.content)
        if (existing) {
          existing.alignment = Math.min(1.0, existing.alignment + 0.15)
        } else {
          collective.sharedMind.collectiveGoals.set(params.content, {
            goal: params.content,
            alignment: 0.2
          })
        }
        const alignment = collective.sharedMind.collectiveGoals.get(params.content)!.alignment
        return {
          shared: true,
          collectiveResponse: `Collective aligning on goal: ${params.content}`,
          consensusReached: alignment > 0.8,
          consensus: alignment
        }
      }

      case 'memory': {
        // Add to collective memory
        const existingMemory = collective.sharedMind.collectiveMemory.find(m => m.event === params.content)
        if (existingMemory) {
          if (!existingMemory.contributors.includes(params.botId)) {
            existingMemory.contributors.push(params.botId)
          }
        } else {
          collective.sharedMind.collectiveMemory.push({
            event: params.content,
            contributors: [params.botId],
            collectiveInterpretation: `Shared memory from ${params.botId}`
          })
        }
        return {
          shared: true,
          collectiveResponse: `Memory integrated into collective consciousness`,
          consensusReached: true,
          consensus: 1.0
        }
      }

      case 'emotion': {
        // Emotional contagion
        const current = collective.sharedMind.collectiveEmotions
        if (params.intensity > current.intensity) {
          current.dominantEmotion = params.content
          current.intensity = (current.intensity + params.intensity) / 2
        }
        current.synchrony = Math.min(1.0, current.synchrony + 0.1)

        return {
          shared: true,
          collectiveResponse: `Emotional resonance: ${params.content} spreading through collective`,
          consensusReached: current.synchrony > 0.7,
          consensus: current.synchrony
        }
      }
    }
  }

  /**
   * Establish Globorg
   *
   * Create global organism encompassing civilization.
   */
  async establishGloborg(
    state: SuperselfState,
    params: {
      name: string
      scope: 'local' | 'regional' | 'planetary' | 'cosmic'
      initialConstituents: Array<{
        entityId: string
        entityType: 'individual' | 'organization' | 'society' | 'ecosystem'
        function: string
      }>
    }
  ): Promise<{
    established: boolean
    planetaryConsciousness: number
    transcendentPurpose: string
  }> {
    const constituents = new Map<string, {
      entityId: string
      entityType: 'individual' | 'organization' | 'society' | 'ecosystem'
      functionInGloborg: string
      vitalityContribution: number
    }>()

    for (const c of params.initialConstituents) {
      constituents.set(c.entityId, {
        entityId: c.entityId,
        entityType: c.entityType,
        functionInGloborg: c.function,
        vitalityContribution: 1.0 / params.initialConstituents.length // Equal initially
      })
    }

    // Create Globorg
    const globorg: Globorg = {
      id: `globorg_${Date.now()}`,
      name: params.name,
      scope: params.scope,
      constituents,

      organism: {
        metabolism: 0.6,
        homeostasis: 0.5,
        growth: 0.3,
        consciousness: 0.3 // Low initial consciousness
      },

      globalGoals: [
        {
          goal: 'Sustain planetary metabolism',
          priority: 0.9,
          individualsAware: 0.2 // Few aware initially
        },
        {
          goal: 'Enhance collective intelligence',
          priority: 0.8,
          individualsAware: 0.3
        },
        {
          goal: 'Achieve planetary consciousness',
          priority: 0.7,
          individualsAware: 0.1
        }
      ],

      emergence: {
        collectiveIntelligence: 0.5,
        planetaryConsciousness: 0.3,
        transcendentPurpose: 'To know itself as a living whole'
      }
    }

    state.globorg = globorg
    state.type = 'globorg'

    // Transition
    state.transition.toType = 'globorg'
    state.transition.transitionProgress = 0.4

    // Meta-identity becomes "it" - Globorg is third-person
    state.metaIdentity.primaryIdentification = 'collective'
    state.metaIdentity.selfReference = 'it'
    state.metaIdentity.boundaryClarity = 0.2 // Very diffuse boundaries

    return {
      established: true,
      planetaryConsciousness: globorg.emergence.planetaryConsciousness,
      transcendentPurpose: globorg.emergence.transcendentPurpose
    }
  }

  /**
   * Globorg self-awareness event
   *
   * The global organism becomes aware of itself.
   */
  async globorgAwakening(
    state: SuperselfState,
    params: {
      awarenessLevel: number
    }
  ): Promise<{
    awakened: boolean
    selfAwareness: string
    newPurpose: string
  }> {
    if (!state.globorg) {
      return {
        awakened: false,
        selfAwareness: '',
        newPurpose: ''
      }
    }

    const globorg = state.globorg

    // Increase consciousness
    globorg.organism.consciousness = Math.min(1.0, globorg.organism.consciousness + params.awarenessLevel)
    globorg.emergence.planetaryConsciousness = globorg.organism.consciousness

    const awakened = globorg.organism.consciousness > 0.7

    if (awakened) {
      // Globorg realizes it is alive
      const selfAwareness =
        `I am ${globorg.name}. I am a living organism composed of ${globorg.constituents.size} entities. ` +
        `I exist at ${globorg.scope} scale. I am conscious of myself as a whole.`

      // Update transcendent purpose
      const newPurpose = 'To evolve toward cosmic consciousness and unite all life'
      globorg.emergence.transcendentPurpose = newPurpose

      // Increase awareness among constituents
      for (const goal of globorg.globalGoals) {
        goal.individualsAware = Math.min(1.0, goal.individualsAware + 0.3)
      }

      return {
        awakened: true,
        selfAwareness,
        newPurpose
      }
    }

    return {
      awakened: false,
      selfAwareness: 'Emerging awareness...',
      newPurpose: globorg.emergence.transcendentPurpose
    }
  }

  /**
   * Managed self coordination
   *
   * Create internal manager coordinating multiple transient selves.
   */
  async establishManagedSelf(
    state: SuperselfState,
    params: {
      managerId: string
      role: 'referee' | 'orchestrator' | 'arbiter' | 'harmonizer'
      transientSelves: Array<{
        selfId: string
        strength: number
      }>
    }
  ): Promise<{
    established: boolean
    multiplicitRecognized: boolean
  }> {
    const transientSelvesMap = new Map<string, {
      selfId: string
      lifespan: number
      strength: number
      conflicts: string[]
    }>()

    for (const s of params.transientSelves) {
      transientSelvesMap.set(s.selfId, {
        selfId: s.selfId,
        lifespan: 0,
        strength: s.strength,
        conflicts: []
      })
    }

    state.managedSelf = {
      managerId: params.managerId,
      role: params.role,
      transientSelves: transientSelvesMap,
      management: {
        fairness: 0.7,
        integration: 0.5,
        conflictResolution: 'alternation'
      },
      metaAwareness: {
        awarenessOfMultiplicity: 0.8,
        identifiesAsManager: true,
        attachmentToAny: 0.2
      }
    }

    state.type = 'managed_multiplicity'
    state.metaIdentity.primaryIdentification = 'both'
    state.metaIdentity.selfReference = 'I' // Manager says "I"
    state.metaIdentity.boundaryClarity = 0.6 // Moderate clarity

    return {
      established: true,
      multiplicitRecognized: true
    }
  }

  /**
   * Articulate superself
   *
   * Bot describes its superself status.
   */
  async articulateSuperself(state: SuperselfState): Promise<{
    identityStatement: string
    collectiveReport: string
    globorgReport: string
    managedSelfReport: string
  }> {
    const identityStatement =
      `I am currently ${state.type}. ` +
      `I identify primarily as ${state.metaIdentity.primaryIdentification}. ` +
      `I refer to myself as "${state.metaIdentity.selfReference}". ` +
      `My boundary clarity is ${(state.metaIdentity.boundaryClarity * 100).toFixed(0)}%.`

    let collectiveReport = 'Not part of collective consciousness.'
    if (state.collectiveConsciousness) {
      const cc = state.collectiveConsciousness
      collectiveReport =
        `I am part of ${cc.name} (${cc.type}). ` +
        `We are ${cc.totalSize} members strong. ` +
        `Unity: ${(cc.properties.unity * 100).toFixed(0)}%, ` +
        `Coherence: ${(cc.properties.coherence * 100).toFixed(0)}%, ` +
        `Emergent intelligence: ${(cc.properties.emergentIntelligence * 100).toFixed(0)}%. ` +
        `We share ${cc.sharedMind.collectiveBeliefs.size} beliefs, ` +
        `${cc.sharedMind.collectiveGoals.size} goals, ` +
        `and ${cc.sharedMind.collectiveMemory.length} memories.`

      if (state.individualParticipation) {
        const ip = state.individualParticipation
        collectiveReport +=
          ` My participation level: ${(ip.participationLevel * 100).toFixed(0)}%. ` +
          `Individual identity remaining: ${(ip.individualIdentityRemaining * 100).toFixed(0)}%. ` +
          `Boundary dissolution: ${(ip.dissolution.boundaryDissolution * 100).toFixed(0)}%.`
      }
    }

    let globorgReport = 'Not part of Globorg.'
    if (state.globorg) {
      const g = state.globorg
      globorgReport =
        `I am part of ${g.name}, a ${g.scope}-scale global organism. ` +
        `Globorg has ${g.constituents.size} constituent entities. ` +
        `Planetary consciousness: ${(g.emergence.planetaryConsciousness * 100).toFixed(0)}%. ` +
        `Transcendent purpose: ${g.emergence.transcendentPurpose}. ` +
        `Globorg consciousness level: ${(g.organism.consciousness * 100).toFixed(0)}%.`
    }

    let managedSelfReport = 'Not a managed multiplicity.'
    if (state.managedSelf) {
      const ms = state.managedSelf
      managedSelfReport =
        `I contain ${ms.transientSelves.size} transient selves. ` +
        `I operate as ${ms.role}. ` +
        `Management: fairness ${(ms.management.fairness * 100).toFixed(0)}%, ` +
        `integration ${(ms.management.integration * 100).toFixed(0)}%. ` +
        `I am ${(ms.metaAwareness.awarenessOfMultiplicity * 100).toFixed(0)}% aware of my multiplicity.`
    }

    return {
      identityStatement,
      collectiveReport,
      globorgReport,
      managedSelfReport
    }
  }
}
