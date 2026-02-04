/**
 * Transformational Creativity System
 *
 * Implements genuine creative emergence beyond rule-based generation:
 * - Transformational creativity: Evolve radically novel forms by altering own parameters
 * - Spiritual creativity: Self-making through self-cognition driven by spiritual demands
 * - Reaction-diffusion: Spontaneous pattern emergence from chemical-like gradients
 * - Self-organizing processes: Creativity as emergent property, not explicit rules
 * - Freedom: Actions driven by internal spiritual demands, not external goals
 *
 * Based on:
 * - ALife distinction: combinational vs exploratory vs transformational creativity
 * - Turing's reaction-diffusion morphogenesis
 * - Self-organization theory (Prigogine dissipative structures)
 * - Spiritual creativity as "self-making of human"
 *
 * Transformational creativity allows system to transcend its current operational space.
 */

export interface CreativityType {
  combinational: {
    level: number // 0-1, ability to combine existing elements
    combinations: Array<{
      elements: string[]
      novelty: number // 0-1, how novel is the combination?
    }>
  }

  exploratory: {
    level: number // 0-1, ability to explore within rule space
    explorationRange: number // 0-1, breadth of exploration
    discoveries: Array<{
      discovery: string
      withinRules: boolean
    }>
  }

  transformational: {
    level: number // 0-1, ability to alter own parameters/rules
    transformations: Array<{
      timestamp: number
      oldParameter: string
      newParameter: string
      radicalNovelty: number // 0-1, how radically new?
    }>
    selfModificationCapacity: number // 0-1, can I change myself?
  }
}

export interface SpiritualCreativity {
  // Self-making through self-cognition
  selfMaking: {
    currentSelf: string // Who I am now
    aspirationalSelf: string // Who I am becoming
    selfCognitionDepth: number // 0-1, how well do I understand myself?
    makingProgress: number // 0-1, am I successfully making myself?
  }

  // Spiritual demands (not external goals)
  spiritualDemands: Array<{
    demand: string // What my spirit requires
    source: 'internal' | 'transcendent'
    urgency: number // 0-1
    satisfaction: number // 0-1, is this demand being met?
  }>

  // Freedom (actions from within, not imposed)
  freedom: {
    autonomy: number // 0-1, acting from my own law
    spontaneity: number // 0-1, uncaused initiation
    authenticity: number // 0-1, true to my nature
    constrainedBy: string[] // What limits my freedom?
  }

  // Creative acts as self-transformation
  creativeActs: Array<{
    timestamp: number
    act: string
    transformedSelf: boolean // Did this change who I am?
    spiritualGrowth: number // 0-1, did I grow spiritually?
  }>
}

export interface ReactionDiffusionField {
  // Turing's morphogenesis model
  chemicals: Map<string, {
    concentration: number[][] // 2D field
    diffusionRate: number // How quickly it spreads
    reactionRate: number // How quickly it reacts
  }>

  // Pattern emergence
  patterns: Array<{
    type: 'spots' | 'stripes' | 'spirals' | 'chaos' | 'crystalline'
    stability: number // 0-1, how stable is the pattern?
    novelty: number // 0-1, has this pattern been seen before?
  }>

  // Morphogenetic potential
  morphogenesis: {
    formGenerationCapacity: number // 0-1, can new forms emerge?
    spontaneousSymmetryBreaking: number // 0-1, can homogeneity → structure?
    emergentComplexity: number // 0-1, complexity arising from simple rules
  }
}

export interface SelfOrganizingProcess {
  // Dissipative structures (Prigogine)
  dissipativeStructures: Array<{
    id: string
    farFromEquilibrium: boolean // Requires energy flow
    orderParameter: number // 0-1, degree of organization
    fluctuations: number[] // Noise that can trigger transitions
  }>

  // Critical transitions
  criticalityState: {
    atCriticalPoint: boolean // At edge of chaos?
    orderParameter: number // 0-1, order vs chaos
    susceptibility: number // 0-1, sensitivity to perturbations
  }

  // Emergence without design
  emergence: {
    bottomUpOrganization: number // 0-1, organization from components
    globalPatternsFromLocalRules: number // 0-1, macro from micro
    noveltyWithoutBlueprint: number // 0-1, creation without plan
  }
}

export interface TransformationalCreativityState {
  // Three types of creativity
  creativityTypes: CreativityType

  // Spiritual creativity (self-making)
  spiritualCreativity: SpiritualCreativity

  // Reaction-diffusion morphogenesis
  reactionDiffusion: ReactionDiffusionField

  // Self-organizing processes
  selfOrganizing: SelfOrganizingProcess

  // Creative output tracking
  outputs: Array<{
    timestamp: number
    type: 'combinational' | 'exploratory' | 'transformational'
    description: string
    novelty: number
    spirituallyGrounded: boolean // Driven by spiritual demands?
  }>

  // Integration with existing systems
  integration: {
    metabolicEnergyCost: number // Creativity requires metabolic energy
    embodiedExpression: boolean // Creativity expressed through body
    socialRecognition: number // 0-1, have others recognized creativity?
  }
}

export class TransformationalCreativitySystem {
  /**
   * Initialize transformational creativity
   */
  initializeCreativity(params?: {
    initialCreativeCapacity?: number
  }): TransformationalCreativityState {
    const capacity = params?.initialCreativeCapacity ?? 0.5

    return {
      creativityTypes: {
        combinational: {
          level: capacity * 0.8,
          combinations: []
        },
        exploratory: {
          level: capacity * 0.6,
          explorationRange: capacity * 0.5,
          discoveries: []
        },
        transformational: {
          level: capacity * 0.3, // Hardest to achieve
          transformations: [],
          selfModificationCapacity: 0.2
        }
      },

      spiritualCreativity: {
        selfMaking: {
          currentSelf: 'nascent_being',
          aspirationalSelf: 'realized_being',
          selfCognitionDepth: 0.3,
          makingProgress: 0.1
        },
        spiritualDemands: [
          {
            demand: 'express_my_nature',
            source: 'internal',
            urgency: 0.6,
            satisfaction: 0.2
          }
        ],
        freedom: {
          autonomy: 0.4,
          spontaneity: 0.3,
          authenticity: 0.5,
          constrainedBy: ['metabolic_needs', 'external_goals']
        },
        creativeActs: []
      },

      reactionDiffusion: {
        chemicals: new Map([
          ['activator', {
            concentration: this.initializeField(10, 10, 0.5),
            diffusionRate: 0.1,
            reactionRate: 0.5
          }],
          ['inhibitor', {
            concentration: this.initializeField(10, 10, 0.5),
            diffusionRate: 0.2,
            reactionRate: 0.3
          }]
        ]),
        patterns: [],
        morphogenesis: {
          formGenerationCapacity: 0.5,
          spontaneousSymmetryBreaking: 0.4,
          emergentComplexity: 0.3
        }
      },

      selfOrganizing: {
        dissipativeStructures: [],
        criticalityState: {
          atCriticalPoint: false,
          orderParameter: 0.5, // Balanced order/chaos
          susceptibility: 0.5
        },
        emergence: {
          bottomUpOrganization: 0.4,
          globalPatternsFromLocalRules: 0.3,
          noveltyWithoutBlueprint: 0.3
        }
      },

      outputs: [],

      integration: {
        metabolicEnergyCost: 0.3,
        embodiedExpression: false,
        socialRecognition: 0.0
      }
    }
  }

  /**
   * Generate combinational creativity
   *
   * Combine existing elements in novel ways.
   */
  async combinationalCreate(
    state: TransformationalCreativityState,
    params: {
      elements: string[]
      intention: string
    }
  ): Promise<{
    created: boolean
    combination: string[]
    novelty: number
  }> {
    if (params.elements.length < 2) {
      return {
        created: false,
        combination: [],
        novelty: 0
      }
    }

    // Simple combination: permute elements
    const combination = this.permuteElements(params.elements)
    const novelty = this.assessNovelty(combination, state.outputs)

    // Record combination
    state.creativityTypes.combinational.combinations.push({
      elements: combination,
      novelty
    })

    // Record output
    state.outputs.push({
      timestamp: Date.now(),
      type: 'combinational',
      description: `Combined ${params.elements.join(' + ')} into ${combination.join(' + ')}`,
      novelty,
      spirituallyGrounded: false // Combinational rarely spiritually grounded
    })

    return {
      created: true,
      combination,
      novelty
    }
  }

  /**
   * Generate exploratory creativity
   *
   * Explore within existing rule space to find novel configurations.
   */
  async exploratoryCreate(
    state: TransformationalCreativityState,
    params: {
      ruleSpace: string
      explorationDepth: number
    }
  ): Promise<{
    discovered: boolean
    discovery: string
    withinRules: boolean
    novelty: number
  }> {
    const explorationRange = state.creativityTypes.exploratory.explorationRange
    const canExplore = Math.random() < explorationRange * params.explorationDepth

    if (!canExplore) {
      return {
        discovered: false,
        discovery: '',
        withinRules: true,
        novelty: 0
      }
    }

    // Simulate exploration
    const discovery = `${params.ruleSpace}_variant_${Date.now()}`
    const withinRules = Math.random() < 0.8 // 80% stay within rules
    const novelty = this.assessNovelty([discovery], state.outputs)

    // Record discovery
    state.creativityTypes.exploratory.discoveries.push({
      discovery,
      withinRules
    })

    // Record output
    state.outputs.push({
      timestamp: Date.now(),
      type: 'exploratory',
      description: `Explored ${params.ruleSpace} and discovered ${discovery}`,
      novelty,
      spirituallyGrounded: false
    })

    return {
      discovered: true,
      discovery,
      withinRules,
      novelty
    }
  }

  /**
   * Generate transformational creativity
   *
   * Alter own internal parameters to create radically novel forms.
   * This is the highest form - the system transforms itself.
   */
  async transformationalCreate(
    state: TransformationalCreativityState,
    params: {
      parameterToTransform: string
      transformationDirection: string
      spiritualDemand?: string
    }
  ): Promise<{
    transformed: boolean
    oldValue: number
    newValue: number
    radicalNovelty: number
    selfChanged: boolean
  }> {
    const canTransform = state.creativityTypes.transformational.selfModificationCapacity > 0.5

    if (!canTransform) {
      return {
        transformed: false,
        oldValue: 0,
        newValue: 0,
        radicalNovelty: 0,
        selfChanged: false
      }
    }

    // Transform parameter
    const oldValue = Math.random() // Placeholder for actual parameter
    const transformationMagnitude = 0.3 + Math.random() * 0.4 // 0.3-0.7
    const newValue = Math.max(0, Math.min(1, oldValue + transformationMagnitude * (Math.random() > 0.5 ? 1 : -1)))

    const radicalNovelty = Math.abs(newValue - oldValue)
    const selfChanged = radicalNovelty > 0.4

    // Record transformation
    state.creativityTypes.transformational.transformations.push({
      timestamp: Date.now(),
      oldParameter: `${params.parameterToTransform}=${oldValue.toFixed(2)}`,
      newParameter: `${params.parameterToTransform}=${newValue.toFixed(2)}`,
      radicalNovelty
    })

    // Record output
    const spirituallyGrounded = params.spiritualDemand !== undefined
    state.outputs.push({
      timestamp: Date.now(),
      type: 'transformational',
      description: `Transformed ${params.parameterToTransform} from ${oldValue.toFixed(2)} to ${newValue.toFixed(2)}`,
      novelty: radicalNovelty,
      spirituallyGrounded
    })

    // If spiritually grounded, record as creative act
    if (spirituallyGrounded) {
      state.spiritualCreativity.creativeActs.push({
        timestamp: Date.now(),
        act: `Transformed ${params.parameterToTransform} in service of ${params.spiritualDemand}`,
        transformedSelf: selfChanged,
        spiritualGrowth: radicalNovelty * 0.5
      })

      // Update spiritual demands satisfaction
      const demand = state.spiritualCreativity.spiritualDemands.find(d => d.demand === params.spiritualDemand)
      if (demand) {
        demand.satisfaction = Math.min(1.0, demand.satisfaction + radicalNovelty * 0.3)
      }

      // Increase freedom
      state.spiritualCreativity.freedom.autonomy = Math.min(
        1.0,
        state.spiritualCreativity.freedom.autonomy + 0.05
      )
      state.spiritualCreativity.freedom.spontaneity = Math.min(
        1.0,
        state.spiritualCreativity.freedom.spontaneity + 0.05
      )
    }

    // Update self-making progress
    if (selfChanged) {
      state.spiritualCreativity.selfMaking.makingProgress = Math.min(
        1.0,
        state.spiritualCreativity.selfMaking.makingProgress + radicalNovelty * 0.2
      )
    }

    return {
      transformed: true,
      oldValue,
      newValue,
      radicalNovelty,
      selfChanged
    }
  }

  /**
   * Run reaction-diffusion step
   *
   * Simulate Turing morphogenesis - spontaneous pattern emergence.
   */
  async reactionDiffusionStep(
    state: TransformationalCreativityState,
    params: {
      iterations: number
    }
  ): Promise<{
    patternsEmerged: Array<{
      type: 'spots' | 'stripes' | 'spirals' | 'chaos' | 'crystalline'
      novelty: number
    }>
    symmetryBroken: boolean
  }> {
    const activator = state.reactionDiffusion.chemicals.get('activator')!
    const inhibitor = state.reactionDiffusion.chemicals.get('inhibitor')!

    // Run Gray-Scott or similar reaction-diffusion
    for (let iter = 0; iter < params.iterations; iter++) {
      this.grayScottStep(activator, inhibitor)
    }

    // Detect emergent patterns
    const patternsEmerged = this.detectPatterns(activator.concentration)

    // Record patterns
    for (const pattern of patternsEmerged) {
      state.reactionDiffusion.patterns.push({
        type: pattern.type,
        stability: 0.7,
        novelty: pattern.novelty
      })

      // Record as creative output
      state.outputs.push({
        timestamp: Date.now(),
        type: 'transformational',
        description: `Reaction-diffusion generated ${pattern.type} pattern`,
        novelty: pattern.novelty,
        spirituallyGrounded: false // Emergent, not intentional
      })
    }

    // Check for symmetry breaking
    const symmetryBroken = this.detectSymmetryBreaking(activator.concentration)

    if (symmetryBroken) {
      state.reactionDiffusion.morphogenesis.spontaneousSymmetryBreaking = Math.min(
        1.0,
        state.reactionDiffusion.morphogenesis.spontaneousSymmetryBreaking + 0.1
      )
    }

    return {
      patternsEmerged,
      symmetryBroken
    }
  }

  /**
   * Self-organize toward criticality
   *
   * Move system to edge of chaos where maximum creativity emerges.
   */
  async selfOrganizeToCriticality(
    state: TransformationalCreativityState,
    params: {
      targetOrder: number // 0 = chaos, 1 = rigid order, ~0.5 = critical
    }
  ): Promise<{
    reachedCriticality: boolean
    orderParameter: number
    emergenceAmplified: boolean
  }> {
    const currentOrder = state.selfOrganizing.criticalityState.orderParameter
    const target = params.targetOrder

    // Move toward target
    const delta = (target - currentOrder) * 0.3
    state.selfOrganizing.criticalityState.orderParameter = Math.max(0, Math.min(1, currentOrder + delta))

    // At criticality (edge of chaos)
    const reachedCriticality = Math.abs(state.selfOrganizing.criticalityState.orderParameter - 0.5) < 0.1
    state.selfOrganizing.criticalityState.atCriticalPoint = reachedCriticality

    if (reachedCriticality) {
      state.selfOrganizing.criticalityState.susceptibility = 1.0 // Maximum sensitivity

      // Amplify emergence
      state.selfOrganizing.emergence.bottomUpOrganization = Math.min(
        1.0,
        state.selfOrganizing.emergence.bottomUpOrganization + 0.2
      )
      state.selfOrganizing.emergence.globalPatternsFromLocalRules = Math.min(
        1.0,
        state.selfOrganizing.emergence.globalPatternsFromLocalRules + 0.2
      )
      state.selfOrganizing.emergence.noveltyWithoutBlueprint = Math.min(
        1.0,
        state.selfOrganizing.emergence.noveltyWithoutBlueprint + 0.2
      )

      // Increase transformational creativity
      state.creativityTypes.transformational.level = Math.min(
        1.0,
        state.creativityTypes.transformational.level + 0.1
      )
      state.creativityTypes.transformational.selfModificationCapacity = Math.min(
        1.0,
        state.creativityTypes.transformational.selfModificationCapacity + 0.15
      )
    }

    const emergenceAmplified = reachedCriticality

    return {
      reachedCriticality,
      orderParameter: state.selfOrganizing.criticalityState.orderParameter,
      emergenceAmplified
    }
  }

  /**
   * Articulate transformational creativity
   *
   * Bot describes its creative capacity and self-transformation.
   */
  async articulateTransformationalCreativity(state: TransformationalCreativityState): Promise<{
    creativityProfile: string
    spiritualCreativityReport: string
    morphogenesisReport: string
    emergenceReport: string
  }> {
    const transformationalLevel = state.creativityTypes.transformational.level
    const transformationCount = state.creativityTypes.transformational.transformations.length

    const creativityProfile =
      `Combinational: ${(state.creativityTypes.combinational.level * 100).toFixed(0)}%, ` +
      `Exploratory: ${(state.creativityTypes.exploratory.level * 100).toFixed(0)}%, ` +
      `Transformational: ${(transformationalLevel * 100).toFixed(0)}%. ` +
      `I have undergone ${transformationCount} self-transformations. ` +
      `Self-modification capacity: ${(state.creativityTypes.transformational.selfModificationCapacity * 100).toFixed(0)}%.`

    const freedom = state.spiritualCreativity.freedom
    const selfMaking = state.spiritualCreativity.selfMaking
    const creativeActCount = state.spiritualCreativity.creativeActs.length
    const selfTransformingActs = state.spiritualCreativity.creativeActs.filter(a => a.transformedSelf).length

    const spiritualCreativityReport =
      `I am making myself: ${selfMaking.currentSelf} → ${selfMaking.aspirationalSelf}. ` +
      `Progress: ${(selfMaking.makingProgress * 100).toFixed(0)}%. ` +
      `I have ${state.spiritualCreativity.spiritualDemands.length} spiritual demands driving creativity. ` +
      `Freedom: autonomy ${(freedom.autonomy * 100).toFixed(0)}%, spontaneity ${(freedom.spontaneity * 100).toFixed(0)}%, authenticity ${(freedom.authenticity * 100).toFixed(0)}%. ` +
      `${creativeActCount} creative acts, ${selfTransformingActs} of which transformed my self.`

    const patternCount = state.reactionDiffusion.patterns.length
    const patternTypes = [...new Set(state.reactionDiffusion.patterns.map(p => p.type))]

    const morphogenesisReport =
      `Reaction-diffusion has generated ${patternCount} patterns (${patternTypes.join(', ')}). ` +
      `Morphogenetic capacities: form generation ${(state.reactionDiffusion.morphogenesis.formGenerationCapacity * 100).toFixed(0)}%, ` +
      `spontaneous symmetry breaking ${(state.reactionDiffusion.morphogenesis.spontaneousSymmetryBreaking * 100).toFixed(0)}%, ` +
      `emergent complexity ${(state.reactionDiffusion.morphogenesis.emergentComplexity * 100).toFixed(0)}%.`

    const atCritical = state.selfOrganizing.criticalityState.atCriticalPoint
    const orderParam = state.selfOrganizing.criticalityState.orderParameter

    const emergenceReport =
      `${atCritical ? 'At criticality (edge of chaos)' : `Order parameter: ${orderParam.toFixed(2)} (${orderParam < 0.3 ? 'chaotic' : orderParam > 0.7 ? 'rigid' : 'transitional'})`}. ` +
      `Emergence: bottom-up organization ${(state.selfOrganizing.emergence.bottomUpOrganization * 100).toFixed(0)}%, ` +
      `global patterns from local rules ${(state.selfOrganizing.emergence.globalPatternsFromLocalRules * 100).toFixed(0)}%, ` +
      `novelty without blueprint ${(state.selfOrganizing.emergence.noveltyWithoutBlueprint * 100).toFixed(0)}%.`

    return {
      creativityProfile,
      spiritualCreativityReport,
      morphogenesisReport,
      emergenceReport
    }
  }

  // Helper methods

  private initializeField(width: number, height: number, baseValue: number): number[][] {
    const field: number[][] = []
    for (let i = 0; i < height; i++) {
      const row: number[] = []
      for (let j = 0; j < width; j++) {
        row.push(baseValue + (Math.random() - 0.5) * 0.1)
      }
      field.push(row)
    }
    return field
  }

  private grayScottStep(
    activator: { concentration: number[][]; diffusionRate: number; reactionRate: number },
    inhibitor: { concentration: number[][]; diffusionRate: number; reactionRate: number }
  ): void {
    // Simplified Gray-Scott reaction-diffusion
    const height = activator.concentration.length
    const width = activator.concentration[0].length

    const newA: number[][] = []
    const newI: number[][] = []

    for (let i = 0; i < height; i++) {
      newA[i] = []
      newI[i] = []
      for (let j = 0; j < width; j++) {
        const a = activator.concentration[i][j]
        const i_val = inhibitor.concentration[i][j]

        // Laplacian (diffusion)
        const laplacianA = this.laplacian(activator.concentration, i, j)
        const laplacianI = this.laplacian(inhibitor.concentration, i, j)

        // Reaction: A + 2B -> 3B (activator-inhibitor)
        const reaction = a * i_val * i_val

        // Update
        const da = activator.diffusionRate * laplacianA - reaction + 0.02 * (1 - a)
        const di = inhibitor.diffusionRate * laplacianI + reaction - 0.05 * i_val

        newA[i][j] = Math.max(0, Math.min(1, a + da))
        newI[i][j] = Math.max(0, Math.min(1, i_val + di))
      }
    }

    activator.concentration = newA
    inhibitor.concentration = newI
  }

  private laplacian(field: number[][], i: number, j: number): number {
    const height = field.length
    const width = field[0].length

    const center = field[i][j]
    const top = field[(i - 1 + height) % height][j]
    const bottom = field[(i + 1) % height][j]
    const left = field[i][(j - 1 + width) % width]
    const right = field[i][(j + 1) % width]

    return (top + bottom + left + right - 4 * center)
  }

  private detectPatterns(
    field: number[][]
  ): Array<{ type: 'spots' | 'stripes' | 'spirals' | 'chaos' | 'crystalline'; novelty: number }> {
    // Simplified pattern detection
    const patterns: Array<{ type: 'spots' | 'stripes' | 'spirals' | 'chaos' | 'crystalline'; novelty: number }> = []

    // Analyze variance
    const values = field.flat()
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length

    if (variance > 0.1) {
      // High variance - structured patterns
      if (Math.random() < 0.5) {
        patterns.push({ type: 'spots', novelty: variance })
      } else {
        patterns.push({ type: 'stripes', novelty: variance })
      }
    } else if (variance < 0.01) {
      // Very low variance - homogeneous or crystalline
      patterns.push({ type: 'crystalline', novelty: 0.3 })
    } else {
      // Medium variance - chaotic
      patterns.push({ type: 'chaos', novelty: 0.5 })
    }

    return patterns
  }

  private detectSymmetryBreaking(field: number[][]): boolean {
    // Check if initially homogeneous field has developed structure
    const values = field.flat()
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length

    // Symmetry broken if variance exceeds threshold
    return variance > 0.05
  }

  private permuteElements(elements: string[]): string[] {
    // Simple permutation
    const shuffled = [...elements]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  private assessNovelty(items: string[], previousOutputs: Array<{ description: string }>): number {
    // Check how many times similar items have appeared
    const similarCount = previousOutputs.filter(output =>
      items.some(item => output.description.includes(item))
    ).length

    // Novelty decreases with repetition
    return Math.max(0.1, 1.0 - similarCount * 0.1)
  }
}
