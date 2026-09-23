/**
 * EcoHarvest Smart Agriculture Platform
 * Express REST API Server with Persistent SQLite Integration
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const {
  findUserByEmail,
  findUserById,
  createUser,
  verifyPassword,
  addHistory,
  getHistory,
  getUserSolutionsHistory,
  getUserCount
} = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const SERVER_SECRET = process.env.SESSION_SECRET || 'ecoharvest-agritech-secret-key-2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(__dirname));

// Simple HMAC Token Helpers
function generateToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    farm: user.farm,
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
  })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', SERVER_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', SERVER_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && Date.now() > data.exp) return null;

    return data;
  } catch (err) {
    return null;
  }
}

// Authentication Middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

// Optional Auth Middleware (for tracking user if token present)
function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const decoded = verifyToken(token);
    if (decoded) req.user = decoded;
  }
  next();
}

/* ==========================================================================
   REST API Endpoints
   ========================================================================== */

// 1. Health & Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'EcoHarvest Smart Agriculture Platform',
    uptime: Math.round(process.uptime()),
    database: 'SQLite (ecoharvest.db)',
    totalUsers: getUserCount(),
    timestamp: new Date().toISOString()
  });
});

// 2. Authentication Handlers & Routes
function handleRegister(req, res) {
  try {
    const { name, email, password, farm, acres } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const displayName = (name && name.trim()) ? name.trim() : cleanEmail.split('@')[0];
    const displayFarm = (farm && farm.trim()) ? farm.trim() : `${displayName}'s Sustainable Farm`;
    const displayAcres = acres ? acres.toString() : '500';

    const user = createUser({
      name: displayName,
      email: cleanEmail,
      password,
      farm: displayFarm,
      acres: displayAcres
    });

    const token = generateToken(user);

    // Record registration history in SQLite
    addHistory({
      user_id: user.id,
      user_email: user.email,
      type: 'ACCOUNT_REGISTRATION',
      details: { farm: user.farm, acres: user.acres, registeredAt: new Date().toISOString() }
    });

    res.status(201).json({
      message: 'Account registered successfully',
      token,
      user
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
}

function handleLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = verifyPassword(password, user.salt, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      farm: user.farm,
      acres: user.acres
    };

    const token = generateToken(sanitizedUser);

    // Log login session
    addHistory({
      user_id: user.id,
      user_email: user.email,
      type: 'SESSION_LOGIN',
      details: { ip: req.ip, userAgent: req.headers['user-agent'] }
    });

    res.json({
      message: 'Login successful',
      token,
      user: sanitizedUser
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
}

function handleSocialAuth(req, res) {
  try {
    const { provider } = req.body;
    const providerName = provider || 'Google';
    const email = `${providerName.toLowerCase().replace(/[^a-z0-9]/g, '')}-grower@ecoharvest.io`;
    let user = findUserByEmail(email);

    if (!user) {
      user = createUser({
        name: `${providerName} Agronomist`,
        email: email,
        password: `OAuth-${crypto.randomBytes(8).toString('hex')}`,
        farm: `${providerName} Precision Biofarms`,
        acres: '750'
      });
    }

    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      farm: user.farm,
      acres: user.acres
    };

    const token = generateToken(sanitizedUser);

    addHistory({
      user_id: user.id,
      user_email: user.email,
      type: 'SOCIAL_OAUTH_LOGIN',
      details: { provider: providerName, ip: req.ip, loggedInAt: new Date().toISOString() }
    });

    res.json({
      message: `Authenticated via ${providerName}`,
      token,
      user: sanitizedUser
    });
  } catch (err) {
    console.error('Social auth error:', err);
    res.status(500).json({ error: 'Server error during social authentication.' });
  }
}

// Map both /api/register and /api/auth/register, /api/login and /api/auth/login
app.post('/api/register', handleRegister);
app.post('/api/auth/register', handleRegister);
app.post('/api/login', handleLogin);
app.post('/api/auth/login', handleLogin);
app.post('/api/auth/social', handleSocialAuth);

// Direct /auth route to serve the standalone authentication portal
app.get('/auth', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth.html'));
});

// 4. Current Authenticated Profile
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }
  res.json({ user });
});

// 5. Query & Activity History: List
app.get('/api/history', optionalAuthMiddleware, (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const userEmail = req.user ? req.user.email : (req.query.email || null);
    const history = getHistory(userEmail, limit);

    // Parse details JSON if applicable
    const formatted = history.map(item => {
      let parsedDetails = item.details;
      try {
        parsedDetails = JSON.parse(item.details);
      } catch (e) {
        // Leave as string if not JSON
      }
      return {
        ...item,
        details: parsedDetails
      };
    });

    res.json({ history: formatted });
  } catch (err) {
    console.error('History fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve query history.' });
  }
});

// 6. Query & Activity History: Create Entry
app.post('/api/history', optionalAuthMiddleware, (req, res) => {
  try {
    const { type, details } = req.body;
    if (!type || !details) {
      return res.status(400).json({ error: 'type and details are required.' });
    }

    const userId = req.user ? req.user.id : null;
    const userEmail = req.user ? req.user.email : (req.body.user_email || 'guest@ecoharvest.io');

    const entry = addHistory({
      user_id: userId,
      user_email: userEmail,
      type,
      details
    });

    res.status(201).json({
      message: 'History record created',
      entry
    });
  } catch (err) {
    console.error('History record error:', err);
    res.status(500).json({ error: 'Failed to record query event.' });
  }
});

// 7. Interactive Agricultural Problem Diagnostic Engine: Structured Expert Solutions
function generateExpertAgriculturalSolution({ category, crop, symptoms, urgency, hasPhoto }) {
  const text = (symptoms || '').toLowerCase();
  const selectedCrop = crop || 'General Agricultural Farmland';
  const selectedUrgency = urgency || 'moderate';

  // Base structured response schema
  let solution = {
    diagnosis: {
      title: '',
      scientificName: '',
      category: category || 'crop_disease',
      crop: selectedCrop,
      confidence: 95,
      severity: selectedUrgency === 'critical' ? 'CRITICAL RISK' : (selectedUrgency === 'low' ? 'LOW RISK - PREVENTATIVE' : 'MODERATE SEVERITY'),
      pathogenOrCause: '',
      symptomsIdentified: symptoms,
      riskAssessment: ''
    },
    treatments: {
      organic: {
        name: '',
        activeAgent: '',
        omriListed: true,
        dosage: '',
        mechanism: '',
        frequency: '',
        applicationMethod: ''
      },
      chemical: {
        name: '',
        activeIngredient: '',
        tradeExample: '',
        dosage: '',
        mechanism: '',
        preHarvestInterval: '',
        reEntryInterval: '',
        safetyAdvisory: ''
      }
    },
    preventionTips: [],
    telemetryAdvice: {
      irrigationSchedule: '',
      sensorThreshold: '',
      optimalBand: ''
    }
  };

  if (category === 'crop_disease' || text.includes('blight') || text.includes('rust') || text.includes('mildew') || text.includes('rot') || text.includes('fung') || text.includes('leaf spot')) {
    solution.diagnosis.category = 'Crop Disease';

    if (text.includes('corn') || text.includes('maize') || text.includes('gray') || text.includes('lesion') || text.includes('blight')) {
      solution.diagnosis.title = 'Northern Corn Leaf Blight';
      solution.diagnosis.scientificName = 'Exserohilum turcicum / Setosphaeria turcica';
      solution.diagnosis.confidence = 96;
      solution.diagnosis.pathogenOrCause = 'Fungal foliar ascomycete pathogen stimulated by prolonged canopy moisture (>6 hours) and 18-27°C microclimates.';
      solution.diagnosis.riskAssessment = 'Severe yield reduction of 30-50% if lesions progress to the ear leaf prior to silking.';

      solution.treatments.organic = {
        name: 'Bio-Fungicidal Phyllosphere Colonizer & Copper Complex',
        activeAgent: 'Bacillus amyloliquefaciens (Strain D747) + Copper Octanoate',
        omriListed: true,
        dosage: '2.5 L/ha diluted in 250L water carrier (apply at early morning calm)',
        mechanism: 'Competitive colonization of leaf phyllosphere and disruption of fungal cell membranes via lipopeptide secretion.',
        frequency: 'Repeat every 7-10 days during high ambient humidity periods',
        applicationMethod: 'Electrostatic drone canopy misting or low-drift ground boom nozzle'
      };

      solution.treatments.chemical = {
        name: 'Translaminar Quinone Outside & Sterol Demethylation Inhibitor',
        activeIngredient: 'Azoxystrobin (18.2%) + Difenoconazole (11.4%) [FRAC Group 11 + 3]',
        tradeExample: 'Quadris Top / Amistar Gold SC',
        dosage: '450 - 550 mL/ha diluted in 200L clean water',
        mechanism: 'Dual-action: QoI mitochondrial respiration inhibitor paired with sterol ergosterol biosynthesis inhibitor for rapid curative arrest.',
        preHarvestInterval: '14 Days (Maize / Grain)',
        reEntryInterval: '12 Hours',
        safetyAdvisory: 'Alternate chemistry after 2 consecutive sprays to prevent FRAC 11 resistance mutations. Maintain 25m buffer from aquatic waterways.'
      };

      solution.preventionTips = [
        'Crop Rotation: Rotate field with non-host legumes (soy/beans) for 1-2 seasons to exhaust soilborne fungal inoculants.',
        'Residue Management: Perform post-harvest shredding and shallow discing to accelerate microbial decay of infected stalks.',
        'Resistant Genetics: Specify certified Ht-gene resistant hybrid seed varieties (Ht1, Ht2, or HtN alleles) in next cycle.',
        'Canopy Airflow: Maintain 30-inch row spacing and align planting furrows with prevailing wind vectors to shorten leaf wetness duration.'
      ];

      solution.telemetryAdvice = {
        irrigationSchedule: 'Switch automated irrigation from evening mist to early morning ground-drip (05:00 - 08:00).',
        sensorThreshold: 'Interlock solenoid valve controller to pause irrigation pulses when canopy sensor exceeds 80% relative humidity.',
        optimalBand: 'Target Soil Volumetric Moisture: 42 - 46% | Canopy Humidity: < 75% | Soil Temp: 22 - 25°C'
      };

    } else if (text.includes('apple') || text.includes('powder') || text.includes('white') || text.includes('mildew')) {
      solution.diagnosis.title = 'Apple Powdery Mildew';
      solution.diagnosis.scientificName = 'Podosphaera leucotricha';
      solution.diagnosis.confidence = 95;
      solution.diagnosis.pathogenOrCause = 'Obligate biotrophic fungus overwintering inside dormant flower and vegetative shoot buds.';
      solution.diagnosis.riskAssessment = 'Arrests terminal shoot elongation, causes russeting on fruit epidermis, and reduces return bloom by 40%.';

      solution.treatments.organic = {
        name: 'Micronized Bio-Sulfur & Cold-Pressed Neem Oil Emulsion',
        activeAgent: 'Micro-Wettable Sulfur (80%) + Clarified Hydrophobic Extract of Neem',
        omriListed: true,
        dosage: '3.5 kg/ha sulfur + 1.2 L/ha neem oil emulsion',
        mechanism: 'Vapor-phase respiratory interference and disruption of haustoria fungal penetration into epidermal cells.',
        frequency: 'Every 7-10 days from pink bud stage through secondary terminal shoot cessation',
        applicationMethod: 'Air-assisted orchard cannon sprayer delivering fine droplet canopy penetration'
      };

      solution.treatments.chemical = {
        name: 'Succinate Dehydrogenase & DMI Fungicide',
        activeIngredient: 'Fluxapyroxad (21.26%) + Pyraclostrobin (21.26%) [FRAC Group 7 + 11]',
        tradeExample: 'Merivon / Pristine Fungicide',
        dosage: '300 - 400 mL/ha in 500L water',
        mechanism: 'Complex II electron transport inhibition halting fungal spore germination and mycelial expansion.',
        preHarvestInterval: '0 Days (Apples)',
        reEntryInterval: '12 Hours',
        safetyAdvisory: 'Do not exceed 4 applications per season. Do not tank-mix with horticultural oils within a 14-day window to prevent phytotoxicity.'
      };

      solution.preventionTips = [
        'Sanitation Pruning: Prune out white mildewed terminal shoot tips during winter and early spring dormant passes.',
        'Air Circulation: Prune tree center canopy to an open-center or spindle architecture allowing rapid leaf drying.',
        'Balanced Nutrition: Regulate nitrogen application to avoid excessive succulent vegetative flush in late spring.',
        'Resistant Cultivars: When replanting orchard blocks, select cultivars with genetic resistance (e.g., Enterprise, Liberty).'
      ];

      solution.telemetryAdvice = {
        irrigationSchedule: 'Deliver pulsed micro-drip hydration to orchard rootzone; avoid any overhead micro-sprinklers.',
        sensorThreshold: 'Flag canopy microclimate alerts when ambient temperature reaches 19-25°C and relative humidity exceeds 70%.',
        optimalBand: 'Target Soil Volumetric Moisture: 36 - 40% | Rootzone pH: 6.2 - 6.6'
      };

    } else {
      solution.diagnosis.title = 'Foliar Leaf Spot & Anthracnose Complex';
      solution.diagnosis.scientificName = 'Colletotrichum spp. / Cercospora Complex';
      solution.diagnosis.confidence = 92;
      solution.diagnosis.pathogenOrCause = 'Broad-spectrum foliar fungal pathogen penetrating plant cuticle during warm, humid conditions.';
      solution.diagnosis.riskAssessment = 'Premature leaf defoliation leading to diminished photosynthetic capacity and sunburned fruit.';

      solution.treatments.organic = {
        name: 'Bio-Fungicidal Bacillus subtilis & Potassium Bicarbonate',
        activeAgent: 'Bacillus subtilis strain QST 713 + Potassium Bicarbonate (85%)',
        omriListed: true,
        dosage: '2.0 kg/ha in 300L water carrier',
        mechanism: 'Disrupts osmotic cell pressure of fungal hyphae through alkaline pH elevation and antimicrobial lipopeptides.',
        frequency: 'Every 7 days until clear new vegetative growth emerges',
        applicationMethod: 'Foliar misting with thorough coverage of upper and lower leaf surfaces'
      };

      solution.treatments.chemical = {
        name: 'Broad-Spectrum Multi-Site Chloronitrile Fungicide',
        activeIngredient: 'Chlorothalonil (54%) [FRAC Group M05]',
        tradeExample: 'Bravo Weather Stik / Daconil',
        dosage: '1.5 - 2.2 L/ha',
        mechanism: 'Multi-site inhibitor binding to fungal cellular thiol groups, virtually immune to single-gene resistance development.',
        preHarvestInterval: '7 - 14 Days (depending on crop)',
        reEntryInterval: '24 Hours',
        safetyAdvisory: 'Restricted entry interval required. Toxic to aquatic invertebrates; ensure zero chemical drift into drainage canals.'
      };

      solution.preventionTips = [
        'Crop Sanitation: Collect and compost all fallen diseased foliage outside the active production zone.',
        'Mulching: Apply organic straw mulch to create a physical barrier preventing soilborne spore splash-up during rain.',
        'Plant Spacing: Increase spacing between plant beds by 20% to accelerate canopy transpiration drying.',
        'Crop Rotation: Rotate field plot with non-susceptible brassica or allium species.'
      ];

      solution.telemetryAdvice = {
        irrigationSchedule: 'Run drip irrigation strictly between 06:00 and 09:00 to keep overnight leaf wetness at zero hours.',
        sensorThreshold: 'Trigger automated alert if leaf surface wetness sensor registers continuous wetness > 4 hours.',
        optimalBand: 'Target Soil Moisture: 40 - 45% | Ambient Humidity: < 70%'
      };
    }

  } else if (category === 'pest_infestation' || text.includes('pest') || text.includes('aphid') || text.includes('worm') || text.includes('mite') || text.includes('insect') || text.includes('web')) {
    solution.diagnosis.category = 'Pest Infestation';

    if (text.includes('mite') || text.includes('web') || text.includes('mottle')) {
      solution.diagnosis.title = 'Two-Spotted Spider Mite Outbreak';
      solution.diagnosis.scientificName = 'Tetranychus urticae';
      solution.diagnosis.confidence = 97;
      solution.diagnosis.pathogenOrCause = 'Acarine phytophagous pest proliferating under hot (>30°C), dusty, drought-stressed canopy conditions.';
      solution.diagnosis.riskAssessment = 'Severe chlorotic stippling, leaf bronzing, webbing, and catastrophic premature crop defoliation.';

      solution.treatments.organic = {
        name: 'Bio-Acaricide & Phytoseiid Predatory Mites',
        activeAgent: 'Phytoseiulus persimilis (Predatory Mite) + Cold-Pressed Organic Neem Oil',
        omriListed: true,
        dosage: 'Release 5-10 predatory mites/m²; spot-treat hotspots with 1.5% neem oil',
        mechanism: 'Active predatory search and consumption of mite eggs/nymphs; neem inhibits insect ecdysone hormone.',
        frequency: 'Bi-weekly predator releases until predator-to-pest ratio achieves 1:10 equilibrium',
        applicationMethod: 'Manual aerial predator dispersal capsules via drone or broadcast shaker bottles'
      };

      solution.treatments.chemical = {
        name: 'Mite Growth & Respiration Inhibitor (Acaricide)',
        activeIngredient: 'Bifenazate (43.2%) [IRAC Group 25A]',
        tradeExample: 'Acramite 50WS / Floramite',
        dosage: '400 - 550 g/ha in 400L water',
        mechanism: 'GABA neurotransmitter antagonist in peripheral nervous system of mites with knockdown in 48 hours.',
        preHarvestInterval: '7 Days',
        reEntryInterval: '12 Hours',
        safetyAdvisory: 'Selective to tetranychid spider mites with high safety for beneficial predatory insects and honeybees.'
      };

      solution.preventionTips = [
        'Dust Control: Regularly irrigate perimeter farm roads to eliminate dust clouds that shield spider mites from beneficial predators.',
        'Maintain Canopy Hydration: Avoid letting crops enter volumetric moisture stress below 30%.',
        'Insectary Borders: Cultivate flowering cover crops (buckwheat, sweet clover) to provide nectar for native predatory insects.',
        'Winter Washing: Apply dormant superior horticultural oil (2%) during winter to smother overwintering adult females in bark crevices.'
      ];

      solution.telemetryAdvice = {
        irrigationSchedule: 'Increase Sector micro-pulse irrigation by 15% to eliminate plant water stress.',
        sensorThreshold: 'Trigger drone multispectral pass when canopy thermal infrared camera registers crop temperature > 3°C above ambient.',
        optimalBand: 'Target Soil Moisture: 38 - 45% | VPD (Vapour Pressure Deficit): 0.8 - 1.2 kPa'
      };

    } else if (text.includes('army') || text.includes('worm') || text.includes('chew') || text.includes('hole')) {
      solution.diagnosis.title = 'Fall Armyworm Infestation';
      solution.diagnosis.scientificName = 'Spodoptera frugiperda';
      solution.diagnosis.confidence = 96;
      solution.diagnosis.pathogenOrCause = 'Noctuid moth larval feeding on leaf whorls, tassels, and developing reproductive grain ears.';
      solution.diagnosis.riskAssessment = 'Windowpane leaf feeding progressing to total whorl destruction and substantial commercial yield loss.';

      solution.treatments.organic = {
        name: 'Entomopathogenic Endotoxin Formulation',
        activeAgent: 'Bacillus thuringiensis subsp. kurstaki (Bt) + Spinosad (OMRI Listed)',
        omriListed: true,
        dosage: '1.2 kg/ha Bt powder or 200 mL/ha Spinosad (Entrust SC)',
        mechanism: 'Delta-endotoxin crystal proteins bind to insect midgut epithelial receptors, causing gut paralysis within 4 hours.',
        frequency: 'Apply every 5-7 days at twilight when caterpillars actively emerge from whorls to feed',
        applicationMethod: 'Targeted drone aerial drop directed straight into crop whorl funnels'
      };

      solution.treatments.chemical = {
        name: 'Ryanodine Receptor Modulator (Anthranilic Diamide)',
        activeIngredient: 'Chlorantraniliprole (18.4%) [IRAC Group 28]',
        tradeExample: 'Coragen / Altacor Insecticide',
        dosage: '150 - 200 mL/ha in 200L water',
        mechanism: 'Activates insect ryanodine receptors, exhausting intracellular calcium stores and paralyzing feeding muscles.',
        preHarvestInterval: '1 Day',
        reEntryInterval: '4 Hours',
        safetyAdvisory: 'Exceptional safety profile for beneficial predators, earthworms, and honeybees once spray deposits have dried.'
      };

      solution.preventionTips = [
        'Pheromone Lure Trapping: Deploy 3 delta pheromone traps/ha to identify male moth immigration flights 10 days before egg laying.',
        'Intercropping Push-Pull: Intercrop with Desmodium repellant plants and Napier grass border traps around the perimeter.',
        'Early Planting: Align sowing dates with early regional windows to ensure crop silking precedes peak armyworm migratory flights.',
        'Deep Soil Inversion: Deep till soil after harvest to expose overwintering pupae to avian predation and frost.'
      ];

      solution.telemetryAdvice = {
        irrigationSchedule: 'Maintain uniform soil moisture to avoid crop stunting that makes plants vulnerable to defoliation.',
        sensorThreshold: 'Schedule priority autonomous drone multispectral pass across Sector A1 to map leaf defoliation perimeter.',
        optimalBand: 'NDVI Canopy Vigor: > 0.88 | Trap Action Threshold: 3 moths/trap/night'
      };

    } else {
      solution.diagnosis.title = 'Phloem-Feeding Aphid Complex & Honeydew';
      solution.diagnosis.scientificName = 'Aphis gossypii / Myzus persicae';
      solution.diagnosis.confidence = 94;
      solution.diagnosis.pathogenOrCause = 'Dense colonies of phloem-feeding insects extracting plant sap and secreting sugary honeydew.';
      solution.diagnosis.riskAssessment = 'Leaf curling, transmission of destructive plant viruses, and secondary black sooty mold growth.';

      solution.treatments.organic = {
        name: 'Insecticidal Potassium Salts & Lacewing Biological Control',
        activeAgent: 'Potassium Salts of Fatty Acids (49%) + Green Lacewing Larvae',
        omriListed: true,
        dosage: '2.0% volume/volume spray wash + release 2,000 Chrysoperla carnea eggs/ha',
        mechanism: 'Fatty acids disrupt insect cellular membrane integrity; lacewing larvae consume 200+ aphids per life cycle.',
        frequency: 'Apply soap wash twice, 4 days apart; release lacewings 48 hours after wash',
        applicationMethod: 'High-volume boom spray with nozzles directed upward at leaf undersides'
      };

      solution.treatments.chemical = {
        name: 'Tetramic Acid Two-Way Systemic Insecticide',
        activeIngredient: 'Spirotetramat (22.4%) [IRAC Group 23]',
        tradeExample: 'Movento 240 SC',
        dosage: '350 - 450 mL/ha',
        mechanism: 'Inhibits insect lipid biosynthesis (LBI) with full 2-way systemicity translocating to roots and newest growing shoot tips.',
        preHarvestInterval: '7 Days',
        reEntryInterval: '24 Hours',
        safetyAdvisory: 'Do not apply during active crop bloom. Wait until petal fall to ensure zero exposure to pollinating bees.'
      };

      solution.preventionTips = [
        'Nitrogen Management: Eliminate excessive synthetic nitrogen applications that induce vulnerable soft leaf flushes.',
        'Reflective Mulches: Lay silver aluminized plastic mulch during planting to reflect UV light and deter incoming winged aphids.',
        'Ant Management: Control ant colonies at base of crops, as ants protect aphids from natural ladybug predators.',
        'Crop Weed Free Borders: Eliminate alternative weed hosts (e.g. wild mustard, pigweed) along field ditches.'
      ];

      solution.telemetryAdvice = {
        irrigationSchedule: 'Run standard scheduled micro-drip cycles to ensure steady sap flow and plant osmotic turgor.',
        sensorThreshold: 'Correlate sensor data: flag Sector B for inspection if soil temperature exceeds 27°C.',
        optimalBand: 'Target Soil Moisture: 38 - 42% | Sensor Gateway: 915 MHz Normal'
      };
    }

  } else if (category === 'nutrient_deficiency' || text.includes('nutrient') || text.includes('nitrogen') || text.includes('yellow') || text.includes('phosphorus') || text.includes('potassium') || text.includes('ph') || text.includes('chlorosis')) {
    solution.diagnosis.category = 'Soil Nutrient Deficiency';

    if (text.includes('nitrogen') || text.includes('v-shaped') || text.includes('lower leaf') || text.includes('pale')) {
      solution.diagnosis.title = 'Acute Nitrogen (N) Deficiency (Mobile Chlorosis)';
      solution.diagnosis.scientificName = 'Macronutrient Deficiency - Nitrogen Depletion';
      solution.diagnosis.confidence = 98;
      solution.diagnosis.pathogenOrCause = 'Mobile nutrient translocation from older basal foliage to young developing leaves due to rootzone depletion or nitrate leaching.';
      solution.diagnosis.riskAssessment = 'Severe reduction in chlorophyll concentration, stunted stalks, and truncated ear kernel fill.';

      solution.treatments.organic = {
        name: 'Hydrolyzed Amino-Nitrogen & Cold-Water Kelp Booster',
        activeAgent: 'Hydrolyzed Fish Protein & Organic Amino Acids (12-0.5-3) + Soluble Kelp',
        omriListed: true,
        dosage: '5.0 L/ha injected through micro-drip fertigation or 3.0 L/ha dawn foliar spray',
        mechanism: 'Delivers peptide-bound L-amino acids readily assimilated without requiring root nitrate reduction energy.',
        frequency: 'Apply weekly for 3 consecutive irrigation cycles until leaf color index recovers',
        applicationMethod: 'Proportional fertigation dosing pump directly into drip manifold'
      };

      solution.treatments.chemical = {
        name: 'Soluble Technical Urea & Calcium Nitrate Fertigation',
        activeIngredient: 'Calcium Nitrate (15.5-0-0 + 19% Ca) / Technical Urea (46-0-0)',
        tradeExample: 'YaraLiva Calcinit / Hydro-Prill',
        dosage: '25 - 40 kg/ha through drip injection or 5 kg/ha foliar in 250L water',
        mechanism: 'Supplies immediately available nitrate (NO3-) ions directly absorbed by root hairs without delay.',
        preHarvestInterval: '0 Days',
        reEntryInterval: '4 Hours',
        safetyAdvisory: 'Do not exceed 2% foliar concentration under direct solar radiation > 28°C to prevent osmotic leaf tip scorch.'
      };

      solution.preventionTips = [
        'Cover Crop Green Manure: Plant winter hairy vetch and crimson clover to fix 120-160 kg organic nitrogen/ha naturally.',
        'Split Fertigation Dosing: Transition from 2 bulk fertilizer dumps to weekly micro-dosing via irrigation lines.',
        'N-Stabilizers: If applying broadcast urea, blend with urease inhibitors (NBPT) to cut volatilization losses by 60%.',
        'Soil Organic Matter: Target > 3.5% soil organic matter through regular composted manure incorporation to boost CEC.'
      ];

      solution.telemetryAdvice = {
        irrigationSchedule: 'Coordinate fertilizer injection during the middle 50% of the irrigation pulse to avoid leaching past root depth.',
        sensorThreshold: 'Monitor rootzone electrical conductivity (EC) sensor; maintain reading between 1.4 and 1.8 dS/m.',
        optimalBand: 'Target Soil Nitrogen: 140 - 160 ppm | Soil Moisture: 40 - 45% | Soil pH: 6.5 - 6.8'
      };

    } else if (text.includes('ph') || text.includes('acid') || text.includes('purple') || text.includes('phosphorus')) {
      solution.diagnosis.title = 'Phosphorus Fixation & Soil Acidity Lockout';
      solution.diagnosis.scientificName = 'Physiological Lockout - Acidic Rootzone (pH < 5.8)';
      solution.diagnosis.confidence = 96;
      solution.diagnosis.pathogenOrCause = 'Excess soil acidity (pH < 5.8) precipitates phosphorus into insoluble iron/aluminum phosphate complexes, arresting ATP energy transport.';
      solution.diagnosis.riskAssessment = 'Purple leaf margins, arrested root elongation, and poor flowering/seed set.';

      solution.treatments.organic = {
        name: 'Micronized Agricultural Limestone & Humic Chelation',
        activeAgent: 'Calcitic Limestone (98% CaCO3) + Soluble Potassium Humate / Fulvic Acid',
        omriListed: true,
        dosage: '2.0 tonnes/ha broadcast lime + 4.0 kg/ha humic acid through drip lines',
        mechanism: 'Calcium ions neutralize free H+ ions in soil solution; humic complexes chelate locked phosphorus and release it to roots.',
        frequency: 'Single broadcast liming followed by bi-weekly humic fertigation injections',
        applicationMethod: 'Solid broadcast spreader followed by deep incorporation; humic acid through irrigation manifold'
      };

      solution.treatments.chemical = {
        name: 'Monopotassium Phosphate (MKP) Foliar Rescue',
        activeIngredient: 'Monopotassium Phosphate (0-52-34) Technical Grade',
        tradeExample: 'Haifa MKP / PeaK 0-52-34',
        dosage: '3.0 - 5.0 kg/ha in 250L water as immediate foliar spray',
        mechanism: 'Bypasses rootzone lockout entirely via direct stomatal and cuticular absorption of orthophosphate ions.',
        preHarvestInterval: '0 Days',
        reEntryInterval: '4 Hours',
        safetyAdvisory: 'Apply in early morning or late afternoon when stomata are fully open and leaf drying is gradual.'
      };

      solution.preventionTips = [
        'Regular Soil Soil Chemistry Audits: Conduct annual autumn soil sampling across all field quadrants.',
        'Avoid Acidifying Fertilizers: Reduce use of ammonium sulfate and ammonium nitrate on soils with baseline pH < 6.2.',
        'Mycorrhizal Inoculation: Apply Glomus intraradices mycorrhizae at planting to expand active root absorptive surface by 300%.',
        'Crop Residue Buffering: Incorporate composted plant residues to increase soil organic buffer capacity against pH swings.'
      ];

      solution.telemetryAdvice = {
        irrigationSchedule: 'Maintain consistent soil moisture; dry soils exacerbate phosphorus immobilization.',
        sensorThreshold: 'Set automated telemetry alarm if soil pH probe dips below 6.0 in Sector A1.',
        optimalBand: 'Target Soil pH: 6.4 - 6.8 | Available Phosphate: > 25 ppm | Rootzone Moisture: 40 - 45%'
      };

    } else {
      solution.diagnosis.title = 'Micronutrient & Potassium (K) Cation Imbalance';
      solution.diagnosis.scientificName = 'Nutrient Antagonism - K/Mg/Ca Imbalance';
      solution.diagnosis.confidence = 93;
      solution.diagnosis.pathogenOrCause = 'Marginal leaf scorch, interveinal chlorosis caused by cation competition or insufficient trace minerals (Fe, Zn, Mn).';
      solution.diagnosis.riskAssessment = 'Reduced drought tolerance, weakened cell walls, and vulnerability to secondary fungal infection.';

      solution.treatments.organic = {
        name: 'Certified Organic Basalt Rock Dust & Foliar Kelp Extract',
        activeAgent: 'Volcanic Paramagnetic Basalt Rock Dust + Ascophyllum nodosum Extract',
        omriListed: true,
        dosage: '1.5 tonnes/ha soil dust + 2.5 L/ha foliar kelp',
        mechanism: 'Slow-release re-mineralization providing 60+ trace elements, bio-silicon, and natural phytohormones.',
        frequency: 'Seasonal soil application + bi-weekly foliar booster during active vegetative flush',
        applicationMethod: 'Broadcast top-dressing and aerial foliar spray'
      };

      solution.treatments.chemical = {
        name: 'Multi-Chelated Trace Mineral & Potassium Nitrate Tonic',
        activeIngredient: 'Potassium Nitrate (13-0-46) + EDTA Chelated Micronutrient Complex (Fe, Zn, Mn, Cu, B)',
        tradeExample: 'Multi-K Classic / Micro-Mix Pro',
        dosage: '4.0 kg/ha in 250L water as foliar rescue spray',
        mechanism: 'EDTA chelate ring keeps micro-cations in solution, preventing precipitation with carbonates in hard water.',
        preHarvestInterval: '0 Days',
        reEntryInterval: '4 Hours',
        safetyAdvisory: 'Verify water carrier pH is between 5.5 and 6.5 before adding chelate to maximize absorption efficiency.'
      };

      solution.preventionTips = [
        'Base Saturation Ratios: Target 65-70% Ca, 12-15% Mg, and 4-6% K on cation exchange capacity soil tests.',
        'Silicon Amendments: Apply potassium silicate to strengthen plant epidermal cell walls against environmental stress.',
        'Cover Crop Diversity: Include daikon radish to mine subsoil potassium and zinc back up to surface topsoil.',
        'Water Quality Testing: Test irrigation well water for high sodium (SAR > 3) that locks out beneficial potassium.'
      ];

      solution.telemetryAdvice = {
        irrigationSchedule: 'Run steady drip cycles to prevent osmotic stress spikes in the rootzone.',
        sensorThreshold: 'Monitor EC and nitrogen ppm simultaneously on Sector C sensor probes.',
        optimalBand: 'Target Soil EC: 1.2 - 1.6 dS/m | Soil Potassium: 180 - 220 ppm | pH: 6.3 - 6.7'
      };
    }

  } else {
    // Irrigation & Sensor Failure
    solution.diagnosis.category = 'Irrigation & Sensor Failure';
    solution.diagnosis.title = 'Solenoid Actuator Diaphragm Jam & Hydraulic Flow Lockout';
    solution.diagnosis.scientificName = 'Mechanical Actuator Fault - Diaphragm / Pilot Port Failure';
    solution.diagnosis.confidence = 97;
    solution.diagnosis.pathogenOrCause = 'Particulate or mineral scale obstruction inside internal solenoid pilot bleed orifice preventing hydraulic valve opening under line pressure.';
    solution.diagnosis.riskAssessment = 'Complete irrigation cutoff to Sector, triggering severe crop drought stress within 24-48 hours.';

    solution.treatments.organic = {
      name: 'Organic Bio-Based Citric Acid Descaling Flush',
      activeAgent: 'Food-Grade Certified Organic Citric Acid Descaling Agent (100% Bio-derived)',
      omriListed: true,
      dosage: '1.5% concentration solution (15 kg per 1,000L water tank)',
      mechanism: 'Mild natural acid chelation dissolves calcium carbonate scaling, iron deposits, and biological bacterial slime safely.',
      frequency: 'Shock flush immediately; schedule bi-monthly preventive line cleanings',
      applicationMethod: 'Inject upstream of filtration unit, fill lateral lines, soak for 90 minutes, and flush terminal ends'
    };

    solution.treatments.chemical = {
      name: 'Technical Drip Line Acidulant & Mineral Dissolver',
      activeIngredient: 'Technical Phosphoric Acid (85%) / Industrial Sulfamic Scale Remover',
      tradeExample: 'Aqua-Clear Drip Cleaner / Line-Purge Pro',
      dosage: 'Titrated to lower manifold effluent water pH to 4.5 for 45 minutes',
      mechanism: 'Rapid chemical dissolution of insoluble calcium, magnesium phosphates, and iron oxides.',
      preHarvestInterval: 'Flush lines with clean water before next crop irrigation cycle',
      reEntryInterval: '0 Hours',
      safetyAdvisory: 'Always wear eye protection and chemical-resistant gloves during handling. Never add water to concentrated acid.'
    };

    solution.preventionTips = [
      'Automated Backwash Filtration: Install 130-micron disc filtration unit with automated differential pressure trigger (5 PSI).',
      'Annual Diaphragm Replacement: Replace EPDM rubber solenoid diaphragms annually before seasonal peak irrigation demand.',
      'Terminal Line Flush Valves: Install automatic flush valves at ends of all lateral drip runs to clear fine sediment continuously.',
      'Redundant Valve Bypass: Plumb a manual three-way ball valve bypass manifold around all automated electric solenoid stations.'
    ];

    solution.telemetryAdvice = {
      irrigationSchedule: 'Temporarily reroute flow through adjacent Sector bypass line until solenoid actuation verification completes.',
      sensorThreshold: 'Trigger automated emergency SMS alert if flow meter registers 0 LPM while solenoid relay status is energized (ON).',
      optimalBand: 'Manifold Pressure: 28 - 34 PSI | Sector Flow: 14 - 18 LPM | Solenoid Resistance: 25 - 35 Ohms'
    };
  }

  // Normalize treatment property aliases for consistent client API consumption
  if (solution.treatments.organic) {
    const org = solution.treatments.organic;
    const agentVal = org.agent || org.activeAgent || org.name || '';
    org.agent = agentVal;
    org.activeAgent = agentVal;
  }
  if (solution.treatments.chemical) {
    const chem = solution.treatments.chemical;
    const agentVal = chem.agent || chem.activeIngredient || chem.name || '';
    chem.agent = agentVal;
    chem.activeIngredient = agentVal;
  }

  return solution;
}

app.post('/api/diagnostics', optionalAuthMiddleware, (req, res) => {
  try {
    const { category, crop, symptoms, urgency, hasPhoto } = req.body;
    if (!symptoms || symptoms.trim().length < 5) {
      return res.status(400).json({ error: 'Please describe the observed symptoms in at least 5 characters.' });
    }

    const solution = generateExpertAgriculturalSolution({ category, crop, symptoms, urgency, hasPhoto });

    // Identify user ID and email strictly from session / auth token / payload / database
    let userId = req.user ? req.user.id : (req.body.user_id ? parseInt(req.body.user_id, 10) : null);
    let userEmail = req.user ? req.user.email : (req.body.user_email || null);

    if (!userId && userEmail) {
      const found = findUserByEmail(userEmail);
      if (found) {
        userId = found.id;
        userEmail = found.email;
      }
    }

    // Default to registered demo farmer (User ID #1: demo@ecoharvest.io) if guest
    if (!userId) {
      const defaultUser = findUserByEmail('demo@ecoharvest.io');
      if (defaultUser) {
        userId = defaultUser.id;
        userEmail = userEmail || defaultUser.email;
      }
    }

    // Persist exact structured solution into SQLite Database under user ID
    const entry = addHistory({
      user_id: userId,
      user_email: userEmail,
      type: 'AGRONOMIC_DIAGNOSIS',
      details: {
        category: solution.diagnosis.category,
        crop: solution.diagnosis.crop,
        symptoms: symptoms.trim(),
        urgency: solution.diagnosis.severity,
        title: solution.diagnosis.title,
        scientificName: solution.diagnosis.scientificName,
        confidence: solution.diagnosis.confidence,
        pathogenOrCause: solution.diagnosis.pathogenOrCause,
        riskAssessment: solution.diagnosis.riskAssessment,
        treatments: solution.treatments,
        preventionTips: solution.preventionTips,
        telemetryAdvice: solution.telemetryAdvice
      }
    });

    res.status(201).json({
      success: true,
      message: 'Expert agricultural solution generated and logged against user ID in database',
      userId,
      userEmail,
      historyId: entry.id,
      solution
    });
  } catch (err) {
    console.error('Diagnosis processing error:', err);
    res.status(500).json({ error: 'Internal diagnostic processing error.' });
  }
});

// 6. Agricultural Solutions: Submit Problem & Generate Solution
app.post('/api/solutions', optionalAuthMiddleware, (req, res) => {
  try {
    const { problem, symptoms, description, query, category, crop, cropSector, urgency, severity, hasPhoto } = req.body;

    // Normalize problem text input
    const problemText = (problem || symptoms || description || query || '').trim();
    if (!problemText || problemText.length < 5) {
      return res.status(400).json({
        error: 'Please describe your agricultural problem in at least 5 characters.'
      });
    }

    const problemCategory = category || 'crop_disease';
    const targetCrop = crop || cropSector || 'General Field Crops';
    const priorityUrgency = urgency || severity || 'moderate';

    // Generate exact expert structured solution
    const solution = generateExpertAgriculturalSolution({
      category: problemCategory,
      crop: targetCrop,
      symptoms: problemText,
      urgency: priorityUrgency,
      hasPhoto: !!hasPhoto
    });

    // Identify user ID and email strictly from session / auth token / payload / database
    let userId = req.user ? req.user.id : (req.body.user_id ? parseInt(req.body.user_id, 10) : null);
    let userEmail = req.user ? req.user.email : (req.body.user_email || null);

    if (!userId && userEmail) {
      const found = findUserByEmail(userEmail);
      if (found) {
        userId = found.id;
        userEmail = found.email;
      }
    }

    // Default to registered demo farmer (User ID #1: demo@ecoharvest.io) if guest
    if (!userId) {
      const defaultUser = findUserByEmail('demo@ecoharvest.io');
      if (defaultUser) {
        userId = defaultUser.id;
        userEmail = userEmail || defaultUser.email;
      }
    }

    // Save problem and solution into database
    const entry = addHistory({
      user_id: userId,
      user_email: userEmail,
      type: 'AGRICULTURAL_SOLUTION',
      details: {
        problem: problemText,
        category: problemCategory,
        crop: targetCrop,
        urgency: priorityUrgency,
        hasPhoto: !!hasPhoto,
        solution
      }
    });

    res.status(201).json({
      success: true,
      message: 'Agricultural solution generated and saved to database successfully',
      id: entry.id,
      userId,
      userEmail,
      problem: problemText,
      category: problemCategory,
      crop: targetCrop,
      urgency: priorityUrgency,
      solution,
      createdAt: entry.timestamp
    });
  } catch (err) {
    console.error('Solutions processing error:', err);
    res.status(500).json({ error: 'Internal error generating agricultural solution.' });
  }
});

// 7. Agricultural Solutions: Fetch History for Logged-In User
app.get('/api/solutions', optionalAuthMiddleware, (req, res) => {
  try {
    // Resolve user from authentication token, or query parameters
    let userId = req.user ? req.user.id : (req.query.user_id ? parseInt(req.query.user_id, 10) : null);
    let userEmail = req.user ? req.user.email : (req.query.email || req.query.user_email || null);

    // If query email provided without ID, find user
    if (!userId && userEmail) {
      const found = findUserByEmail(userEmail);
      if (found) {
        userId = found.id;
        userEmail = found.email;
      }
    }

    // Require authentication / identification to fetch user-specific history
    if (!userId && !userEmail) {
      return res.status(401).json({
        error: 'Authentication required. Please provide a Bearer token or log in to view solutions history.'
      });
    }

    const limit = parseInt(req.query.limit, 10) || 50;
    const solutions = getUserSolutionsHistory({
      user_id: userId,
      user_email: userEmail,
      limit
    });

    res.json({
      success: true,
      count: solutions.length,
      userId,
      userEmail,
      solutions
    });
  } catch (err) {
    console.error('Fetch solutions history error:', err);
    res.status(500).json({ error: 'Internal error fetching solutions history.' });
  }
});

// Fallback to index.html for SPA navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🌾 EcoHarvest Node.js/Express server active on http://localhost:${PORT}`);
  console.log(`📂 Persistent SQLite database initialized: ecoharvest.db`);
});
