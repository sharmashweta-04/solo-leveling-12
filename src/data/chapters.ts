import { Subject } from '@/src/types';

export interface ChapterDefinition {
  id: string; // e.g. P1, C1, B1
  subject: Subject;
  number: number;
  name: string;
  topics: string[];
}

export const CHAPTERS_DATA: ChapterDefinition[] = [
  // Physics (14 Chapters)
  {
    id: 'P1',
    subject: 'Physics',
    number: 1,
    name: 'Electric Charges and Fields',
    topics: [
      'Electric charge, properties of charge (conservation, quantization, additivity)',
      "Coulomb's law; force between multiple charges; superposition principle",
      'Electric field: concept, field lines, uniform and non-uniform fields',
      'Electric dipole: field on axial and equatorial points; torque on dipole in uniform field',
      "Gauss's law: statement, proof, applications (infinite plane sheet, spherical shell, line charge)",
      'Continuous charge distributions: linear, surface, volume'
    ]
  },
  {
    id: 'P2',
    subject: 'Physics',
    number: 2,
    name: 'Electrostatic Potential and Capacitance',
    topics: [
      'Electric potential: definition, relationship with electric field, potential due to point charge, dipole, system of charges',
      'Equipotential surfaces; potential energy of system of charges; potential energy in external field',
      'Conductors: electrostatics of conductors; electrostatic shielding',
      'Dielectrics and polarization; capacitors and capacitance; parallel plate capacitor',
      'Effect of dielectric on capacitance; combination of capacitors (series, parallel)',
      'Energy stored in capacitor; van de Graaff generator'
    ]
  },
  {
    id: 'P3',
    subject: 'Physics',
    number: 3,
    name: 'Current Electricity',
    topics: [
      'Electric current; drift velocity; mobility; Ohm\'s law; electrical resistance; V-I characteristics',
      'Temperature dependence of resistance; electrical energy and power',
      'Carbon resistors; colour coding; series and parallel combinations',
      'Internal resistance; EMF; terminal potential difference; Kirchhoff\'s laws',
      'Wheatstone bridge; metre bridge; potentiometer (EMF comparison; internal resistance)'
    ]
  },
  {
    id: 'P4',
    subject: 'Physics',
    number: 4,
    name: 'Moving Charges and Magnetism',
    topics: [
      'Biot-Savart law and applications (circular loop, straight conductor)',
      'Ampere\'s circuital law and applications (solenoid, toroid)',
      'Lorentz force; motion in magnetic field; velocity selector; cyclotron',
      'Force on current-carrying conductor; magnetic force between parallel conductors (definition of Ampere)',
      'Torque on current loop; magnetic dipole moment; moving coil galvanometer (conversion to ammeter, voltmeter)'
    ]
  },
  {
    id: 'P5',
    subject: 'Physics',
    number: 5,
    name: 'Magnetism and Matter',
    topics: [
      'Bar magnet as equivalent solenoid; magnetic field lines; Gauss\'s law for magnetism',
      'Earth\'s magnetic field: magnetic elements (declination, inclination/dip, horizontal component)',
      'Magnetic properties of materials: diamagnetic, paramagnetic, ferromagnetic',
      'Curie temperature; hysteresis loop; permanent magnets and electromagnets'
    ]
  },
  {
    id: 'P6',
    subject: 'Physics',
    number: 6,
    name: 'Electromagnetic Induction',
    topics: [
      'Magnetic flux; Faraday\'s law of induction; Lenz\'s law and conservation of energy',
      'Motional EMF; eddy currents (uses and minimization)',
      'Self-inductance and mutual inductance; combination of inductors',
      'AC generator: construction, principle, EMF equation'
    ]
  },
  {
    id: 'P7',
    subject: 'Physics',
    number: 7,
    name: 'Alternating Current',
    topics: [
      'Peak and RMS values of AC; AC voltage applied to resistor, inductor, capacitor',
      'Series LCR circuit: phasor diagram, impedance, resonance, Q-factor',
      'Power in AC circuits: power factor, wattless current',
      'Transformer: principle, construction, types (step-up, step-down), energy losses'
    ]
  },
  {
    id: 'P8',
    subject: 'Physics',
    number: 8,
    name: 'Electromagnetic Waves',
    topics: [
      'Displacement current and Maxwell\'s equations (qualitative idea)',
      'Characteristics and transverse nature of EM waves',
      'Electromagnetic spectrum: radio, microwave, IR, visible, UV, X-rays, gamma rays; production and uses'
    ]
  },
  {
    id: 'P9',
    subject: 'Physics',
    number: 9,
    name: 'Ray Optics and Optical Instruments',
    topics: [
      'Reflection, spherical mirrors, mirror formula; refraction, Snell\'s law, total internal reflection and applications',
      'Refraction at spherical surfaces; lenses; lens maker\'s formula; combination of thin lenses',
      'Refraction through a prism; dispersion; scattering of light (blue sky, reddish sun)',
      'Optical instruments: simple and compound microscope, astronomical telescope'
    ]
  },
  {
    id: 'P10',
    subject: 'Physics',
    number: 10,
    name: 'Wave Optics',
    topics: [
      'Huygens\' principle: proof of reflection and refraction laws',
      'Interference of light; Young\'s double slit experiment (fringe width derivation)',
      'Diffraction at single slit; central maximum width; limit of resolution',
      'Polarization of light; Brewster\'s law; polaroids and applications'
    ]
  },
  {
    id: 'P11',
    subject: 'Physics',
    number: 11,
    name: 'Dual Nature of Radiation and Matter',
    topics: [
      'Photoelectric effect: experimental observations, Einstein\'s photoelectric equation, threshold frequency, work function',
      'Wave-particle duality; de Broglie hypothesis; de Broglie wavelength of electron',
      'Davisson-Germer experiment (qualitative conclusion)'
    ]
  },
  {
    id: 'P12',
    subject: 'Physics',
    number: 12,
    name: 'Atoms',
    topics: [
      'Alpha-particle scattering experiment; Rutherford\'s model of atom and limitations',
      'Bohr\'s atomic model; postulates; radius, velocity, and energy of electron in nth orbit',
      'Hydrogen spectrum: spectral series (Lyman, Balmer, Paschen, Brackett, Pfund); Rydberg formula',
      'de Broglie\'s explanation of Bohr\'s second postulate'
    ]
  },
  {
    id: 'P13',
    subject: 'Physics',
    number: 13,
    name: 'Nuclei',
    topics: [
      'Composition and size of nucleus; mass defect; binding energy per nucleon and variation with mass number',
      'Nuclear forces: characteristics (short range, strong, charge-independent)',
      'Radioactivity: alpha, beta, gamma decay (qualitative); half-life and mean life',
      'Nuclear fission and nuclear fusion; nuclear reactor (basic idea)'
    ]
  },
  {
    id: 'P14',
    subject: 'Physics',
    number: 14,
    name: 'Semiconductor Electronics: Materials, Devices and Simple Circuits',
    topics: [
      'Energy bands in solids: conductors, semiconductors, insulators; intrinsic and extrinsic semiconductors (p-type, n-type)',
      'p-n junction formation; depletion region; barrier potential; forward and reverse bias; I-V characteristics',
      'p-n junction as a rectifier: half-wave and full-wave rectifier; Zener diode as voltage regulator',
      'Special purpose diodes: photodiode, solar cell, LED; digital electronics: basic logic gates (AND, OR, NOT, NAND, NOR)'
    ]
  },

  // Chemistry (10 Chapters)
  {
    id: 'C1',
    subject: 'Chemistry',
    number: 1,
    name: 'Solutions',
    topics: [
      'Types of solutions; concentration terms: molarity, molality, mole fraction, ppm',
      'Solubility: gases in liquids (Henry\'s law); solids in liquids',
      'Vapour pressure of liquid solutions; Raoult\'s law (ideal and non-ideal solutions; azeotropes)',
      'Colligative properties: relative lowering of vapour pressure, elevation of boiling point, depression of freezing point, osmotic pressure',
      'Abnormal molecular mass; Van\'t Hoff factor and degree of dissociation/association'
    ]
  },
  {
    id: 'C2',
    subject: 'Chemistry',
    number: 2,
    name: 'Electrochemistry',
    topics: [
      'Redox reactions; galvanic cells; EMF of a cell; standard electrode potential; Nernst equation and applications',
      'Equilibrium constant from Nernst equation; electrochemical cell and Gibbs free energy',
      'Conductance in electrolytic solutions; specific and molar conductivity; variation with concentration; Kohlrausch\'s law',
      'Electrolysis: Faraday\'s laws of electrolysis; products of electrolysis',
      'Batteries: primary (dry cell, mercury cell) and secondary (lead storage, Ni-Cd); fuel cells; corrosion and prevention'
    ]
  },
  {
    id: 'C3',
    subject: 'Chemistry',
    number: 3,
    name: 'Chemical Kinetics',
    topics: [
      'Rate of reaction: average and instantaneous rates; factors affecting rate',
      'Rate law; order and molecularity of a reaction; rate constant and units',
      'Integrated rate equations: zero-order and first-order reactions; half-life',
      'Pseudo-first-order reactions; temperature dependence: Arrhenius equation, activation energy',
      'Collision theory of chemical reactions (qualitative idea)'
    ]
  },
  {
    id: 'C4',
    subject: 'Chemistry',
    number: 4,
    name: 'The d- and f-Block Elements',
    topics: [
      'Position in periodic table; general electronic configuration; general trends (atomic/ionic radii, ionization enthalpy, oxidation states)',
      'Magnetic properties, catalytic properties, colour of ions, complex formation, interstitial compounds, alloy formation',
      'Preparation, properties, and oxidizing action of K2Cr2O7 and KMnO4',
      'Lanthanoids: electronic configuration, oxidation states, lanthanoid contraction and consequences',
      'Actinoids: electronic configuration, oxidation states, comparison with lanthanoids'
    ]
  },
  {
    id: 'C5',
    subject: 'Chemistry',
    number: 5,
    name: 'Coordination Compounds',
    topics: [
      'Werner\'s theory of coordination compounds; ligands, coordination number, coordination sphere, oxidation state',
      'IUPAC nomenclature of mononuclear coordination compounds',
      'Isomerism in coordination compounds: structural (linkage, ionization, hydrate, coordination) and stereo (geometrical, optical)',
      'Bonding in coordination compounds: Valence Bond Theory (VBT) and Crystal Field Theory (CFT); colour and magnetic properties',
      'Stability of coordination compounds; importance and applications (in metallurgy, biological systems, medicine)'
    ]
  },
  {
    id: 'C6',
    subject: 'Chemistry',
    number: 6,
    name: 'Haloalkanes and Haloarenes',
    topics: [
      'Classification and IUPAC nomenclature; nature of C-X bond',
      'Methods of preparation: from alcohols, hydrocarbons, halogen exchange (Finkelstein, Swarts)',
      'Physical properties: boiling points, density, solubility',
      'Chemical reactions: nucleophilic substitution (SN1 and SN2 mechanisms, stereochemical aspects), elimination reactions (Saytzeff rule), reaction with metals (Grignard)',
      'Haloarenes: preparation from diazonium salts (Sandmeyer); resonance and low reactivity towards nucleophilic substitution; electrophilic substitution; reaction with metals (Wurtz-Fittig, Fittig)',
      'Polyhalogen compounds: uses and environmental effects of CHCl3, CHI3, CCl4, freons, DDT'
    ]
  },
  {
    id: 'C7',
    subject: 'Chemistry',
    number: 7,
    name: 'Alcohols, Phenols and Ethers',
    topics: [
      'Alcohols: classification, nomenclature; preparation (from alkenes, carbonyl compounds, Grignard); physical properties',
      'Alcohols: chemical reactions (acidity, esterification, oxidation, dehydration); distinction between 1°, 2°, 3° (Lucas test)',
      'Phenols: nomenclature; preparation (from cumene, diazonium salts, haloarenes); physical properties',
      'Phenols: chemical reactions (acidic nature, electrophilic aromatic substitution, Kolbe\'s reaction, Reimer-Tiemann, reaction with zinc dust, oxidation)',
      'Ethers: nomenclature; preparation (Williamson\'s ether synthesis); physical properties; chemical reactions (cleavage of C-O bond, electrophilic substitution in anisole)'
    ]
  },
  {
    id: 'C8',
    subject: 'Chemistry',
    number: 8,
    name: 'Aldehydes, Ketones and Carboxylic Acids',
    topics: [
      'Nomenclature and structure of carbonyl group',
      'Aldehydes and Ketones: preparation (from alcohols, alkenes, alkynes, nitriles, acyl chlorides — Rosenmund, Stephen, Etard)',
      'Physical properties: boiling points and solubility',
      'Chemical reactions: nucleophilic addition (HCN, NaHSO3, Grignard, alcohols, ammonia derivatives), reduction (Clemmensen, Wolff-Kishner), oxidation (Tollens\', Fehling\'s, haloform reaction), aldol condensation, Cannizzaro reaction, electrophilic substitution',
      'Carboxylic Acids: nomenclature, structure of -COOH group; preparation (from 1° alcohols, aldehydes, alkylbenzenes, nitriles, Grignard)',
      'Carboxylic Acids: chemical reactions (acidity, formation of anhydride, ester, acyl chloride, amide, reduction, decarboxylation, HVZ reaction, electrophilic substitution)'
    ]
  },
  {
    id: 'C9',
    subject: 'Chemistry',
    number: 9,
    name: 'Amines',
    topics: [
      'Classification, nomenclature, and structure of amines',
      'Methods of preparation: reduction of nitro compounds, ammonolysis of alkyl halides, reduction of nitriles and amides, Gabriel phthalimide synthesis, Hoffmann bromamide degradation',
      'Physical properties: boiling point, solubility, basic character (comparison of aliphatic and aromatic amines, effect of substituent)',
      'Chemical reactions: acylation, carbylamine reaction, reaction with nitrous acid (distinction between 1°, 2°, 3° amines), reaction with benzenesulphonyl chloride (Hinsberg test), electrophilic substitution (bromination, nitration, sulphonation)',
      'Diazonium Salts: preparation, physical properties, chemical reactions (Sandmeyer, Gatterman, replacement by -I, -F, -H, -OH, -NO2), coupling reactions and importance in synthetic organic chemistry'
    ]
  },
  {
    id: 'C10',
    subject: 'Chemistry',
    number: 10,
    name: 'Biomolecules',
    topics: [
      'Carbohydrates: classification (monosaccharides, disaccharides, polysaccharides); glucose (preparation, structure, open-chain vs cyclic, D/L configuration, anomers)',
      'Fructose (structure, mutarotation); disaccharides: sucrose, lactose, maltose (glycosidic linkage, reducing vs non-reducing); polysaccharides: starch, cellulose, glycogen',
      'Proteins: amino acids (classification, essential and non-essential, zwitterion, isoelectric point); peptide bond; primary, secondary (alpha-helix, beta-pleated sheet), tertiary, quaternary structures',
      'Denaturation of proteins; enzymes: characteristics, mechanism of enzyme action',
      'Vitamins: classification (fat-soluble, water-soluble); deficiency diseases',
      'Nucleic Acids: chemical composition (pentose sugar, nitrogenous base, phosphate); structure of nucleosides, nucleotides; DNA (double helix model, replication) and RNA (types and functions); genetic code'
    ]
  },

  // Biology (13 Chapters)
  {
    id: 'B1',
    subject: 'Biology',
    number: 1,
    name: 'Reproduction in Organisms',
    topics: [
      'Reproduction: definition; types (asexual and sexual)',
      'Asexual reproduction: binary fission, budding, fragmentation, spore formation, vegetative propagation',
      'Sexual reproduction: juvenile, reproductive, and senescent phases; pre-fertilization events (gametogenesis, gamete transfer)',
      'Fertilization: syngamy, external and internal fertilization; post-fertilization events (zygote, embryogenesis)'
    ]
  },
  {
    id: 'B2',
    subject: 'Biology',
    number: 2,
    name: 'Sexual Reproduction in Flowering Plants',
    topics: [
      'Flower structure; pre-fertilization: stamen, microsporangium and pollen grain development',
      'Pistil, megasporangium (ovule), embryo sac development (monosporic)',
      'Pollination: types (autogamy, geitonogamy, xenogamy); agents of pollination (wind, water, animals)',
      'Outbreeding devices; pollen-pistil interaction; artificial hybridization',
      'Double fertilization: syngamy and triple fusion; post-fertilization: endosperm types, embryo development (monocot, dicot)',
      'Seed structure; fruit types (true, false, parthenocarpic); apomixis and polyembryony'
    ]
  },
  {
    id: 'B3',
    subject: 'Biology',
    number: 3,
    name: 'Human Reproduction',
    topics: [
      'Male reproductive system: testes, scrotum, seminiferous tubules, Leydig cells, accessory ducts, glands, penis',
      'Female reproductive system: ovaries, Fallopian tubes, uterus, cervix, vagina, external genitalia, mammary glands',
      'Gametogenesis: spermatogenesis (steps, hormonal control, sperm structure) and oogenesis (folliculogenesis, polar bodies)',
      'Menstrual cycle: phases (menstrual, follicular/proliferative, ovulatory, luteal/secretory); hormonal regulation',
      'Fertilization: acrosomal reaction, cortical reaction, polyspermy block, cleavage, morula, blastocyst',
      'Implantation, placenta formation and functions, pregnancy hormones (hCG, hPL, relaxin)',
      'Parturition (foetal ejection reflex, oxytocin) and lactation (colostrum, prolactin)'
    ]
  },
  {
    id: 'B4',
    subject: 'Biology',
    number: 4,
    name: 'Reproductive Health',
    topics: [
      'Reproductive health: problems and strategies; population explosion and birth control (contraceptive methods)',
      'Medical Termination of Pregnancy (MTP): legal conditions and safety',
      'Sexually Transmitted Infections (STIs): types, causative agents, transmission, prevention',
      'Infertility: causes and Assisted Reproductive Technologies (ART): IVF-ET, ZIFT, GIFT, ICSI, IUI, surrogacy'
    ]
  },
  {
    id: 'B5',
    subject: 'Biology',
    number: 5,
    name: 'Principles of Inheritance and Variation',
    topics: [
      'Mendel\'s experiments: monohybrid cross, law of dominance, law of segregation; dihybrid cross, law of independent assortment',
      'Deviations from Mendelism: incomplete dominance, codominance (ABO blood groups), multiple alleles, pleiotropy',
      'Chromosomal Theory of Inheritance (Sutton and Boveri); linkage and recombination (Morgan\'s Drosophila experiments)',
      'Sex determination: humans, birds, honeybees; mutation: gene mutations, chromosomal aberrations',
      'Genetic disorders: Mendelian disorders (haemophilia, sickle-cell anaemia, phenylketonuria, thalassemia) and chromosomal disorders (Down\'s, Turner\'s, Klinefelter\'s)'
    ]
  },
  {
    id: 'B6',
    subject: 'Biology',
    number: 6,
    name: 'Molecular Basis of Inheritance',
    topics: [
      'DNA as genetic material: Hershey-Chase experiment, Griffith transformation, Avery-MacLeod-McCarty',
      'Structure of DNA (Watson-Crick model); packaging of DNA: nucleosome, euchromatin, heterochromatin',
      'DNA replication: semi-conservative model (Meselson-Stahl), replication fork, enzymes involved',
      'Transcription: transcription unit, promoter, RNA polymerase, processing of mRNA (splicing, capping, tailing in eukaryotes)',
      'Genetic code: characteristics; tRNA as adaptor molecule; translation: initiation, elongation, termination',
      'Regulation of gene expression: lac operon (Jacob and Monod); Human Genome Project (salient features, applications); DNA fingerprinting (VNTRs, Southern blotting steps)'
    ]
  },
  {
    id: 'B7',
    subject: 'Biology',
    number: 7,
    name: 'Evolution',
    topics: [
      'Origin of life: Oparin-Haldane theory, Miller-Urey experiment',
      'Evidences for evolution: paleontological, comparative anatomy (homologous and analogous organs), embryological, biochemical',
      'Adaptive radiation: Darwin\'s finches, Australian marsupials',
      'Theories of evolution: Lamarckism, Darwinism (natural selection), Mutation theory (Hugo de Vries)',
      'Hardy-Weinberg principle: factors affecting genetic equilibrium; human evolution: stages from Dryopithecus to Homo sapiens'
    ]
  },
  {
    id: 'B8',
    subject: 'Biology',
    number: 8,
    name: 'Human Health and Disease',
    topics: [
      'Common diseases in humans: bacterial (typhoid, pneumonia), viral (common cold), protozoan (malaria, amoebiasis), fungal (ringworm), helminthic (ascariasis, filariasis); life cycle of Plasmodium',
      'Immunity: innate immunity (physical, physiological, cellular, cytokine barriers); acquired immunity (active, passive, humoral, cell-mediated)',
      'Antibody structure; vaccination and immunization; allergies; autoimmune diseases',
      'Immune system in the body: primary and secondary lymphoid organs',
      'AIDS: causative agent (HIV), structure, transmission, replication cycle, prevention; Cancer: causes, oncogenes, detection, treatment; drug and alcohol abuse: types, addiction, dependence, prevention'
    ]
  },
  {
    id: 'B9',
    subject: 'Biology',
    number: 9,
    name: 'Microbes in Human Welfare',
    topics: [
      'Microbes in household products: curd (LAB), bread (baker\'s yeast), cheese (Swiss, Roquefort), traditional drinks (Toddy)',
      'Microbes in industrial products: fermented beverages, antibiotics (penicillin discovery), chemicals, enzymes, bioactive molecules (cyclosporin A, statins)',
      'Microbes in sewage treatment: primary and secondary treatment (activated sludge), BOD',
      'Microbes in biogas production: methanogens, biogas plant structure and mechanism',
      'Microbes as biocontrol agents (Bacillus thuringiensis, Trichoderma, Baculoviruses); microbes as biofertilizers (Rhizobium, Azotobacter, mycorrhiza, cyanobacteria)'
    ]
  },
  {
    id: 'B10',
    subject: 'Biology',
    number: 10,
    name: 'Biotechnology: Principles and Processes',
    topics: [
      'Principles of biotechnology: genetic engineering and bioprocess engineering',
      'Tools of recombinant DNA technology: restriction enzymes (endonucleases, palindromic sequences, sticky ends), DNA ligase, polymerase, alkaline phosphatase',
      'Cloning vectors: plasmid (pBR322 structure, selectable markers, ori, cloning sites), bacteriophages, cosmid, BAC, YAC; insertional inactivation',
      'Competent host: methods of transformation (chemical, electroporation, gene gun, microinjection)',
      'Processes of rDNA technology: isolation of DNA, cutting, gel electrophoresis, PCR (denaturation, annealing, extension), ligation, insertion, culturing in bioreactors (stirred-tank), downstream processing'
    ]
  },
  {
    id: 'B11',
    subject: 'Biology',
    number: 11,
    name: 'Biotechnology and its Applications',
    topics: [
      'Applications in agriculture: genetically modified organisms (Bt cotton: Cry proteins; pest-resistant plants: RNA interference / RNAi mechanism)',
      'Applications in medicine: genetically engineered insulin (humulin production), gene therapy (ADA deficiency treatment), molecular diagnosis (PCR, ELISA)',
      'Transgenic animals: production, uses (testing vaccine safety, chemical toxicity, biological products: alpha-1-antitrypsin, Rosie cow)',
      'Ethical issues: GEAC role, biopatents, biopiracy (basmati rice, neem, turmeric)'
    ]
  },
  {
    id: 'B12',
    subject: 'Biology',
    number: 12,
    name: 'Organisms and Populations',
    topics: [
      'Organism and its environment: major abiotic factors (temperature, water, light, soil); responses to abiotic factors (regulate, conform, migrate, suspend); adaptations',
      'Populations: population attributes (birth rate, death rate, sex ratio, age pyramids); population growth: models (exponential and logistic growth curves, equations)',
      'Life history variation; population interactions: mutualism, competition (Gause\'s competitive exclusion), predation, parasitism, commensalism, amensalism'
    ]
  },
  {
    id: 'B13',
    subject: 'Biology',
    number: 13,
    name: 'Ecosystem and Biodiversity',
    topics: [
      'Ecosystem: structure and function; productivity (GPP, NPP); decomposition: fragmentation, leaching, catabolism, humification, mineralization',
      'Energy flow: food chain, food web, trophic levels, 10% law; ecological pyramids (pyramid of number, biomass, energy)',
      'Ecological succession: primary and secondary succession; succession of plants (hydrarch, xerarch); nutrient cycling',
      'Biodiversity: levels (genetic, species, ecological); patterns (latitudinal gradients, species-area relationship); loss of biodiversity: Evil Quartet (habitat loss, over-exploitation, alien species, co-extinctions)',
      'Conservation of biodiversity: reasons; approaches: in-situ (national parks, sanctuaries, biosphere reserves, sacred groves) and ex-situ (zoological parks, botanical gardens, cryopreservation)'
    ]
  }
];

export const TOTAL_CHAPTERS = CHAPTERS_DATA.length; // 37
