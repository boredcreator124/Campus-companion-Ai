import fs from 'fs';
import JSZip from './node_modules/jszip/dist/jszip.js';

const wordContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p><w:r><w:t>Chapter 1: Photosynthesis</w:t></w:r></w:p>
<w:p><w:r><w:t>Photosynthesis is the biological process by which plants, algae, and cyanobacteria convert light energy into chemical energy stored as glucose. This process occurs primarily in the chloroplasts of plant cells.</w:t></w:r></w:p>
<w:p><w:r><w:t>The overall equation for photosynthesis is: 6CO2 + 6H2O + light energy = C6H12O6 + 6O2. Carbon dioxide and water are converted into glucose and oxygen using sunlight.</w:t></w:r></w:p>
<w:p><w:r><w:t>Chapter 2: The Light-Dependent Reactions</w:t></w:r></w:p>
<w:p><w:r><w:t>The light-dependent reactions occur in the thylakoid membranes. Chlorophyll absorbs sunlight and uses it to split water molecules in a process called photolysis, releasing oxygen as a byproduct. The energy captured is used to produce ATP and NADPH, which power the Calvin cycle.</w:t></w:r></w:p>
<w:p><w:r><w:t>Photosystem I (P700) and Photosystem II (P680) are two key protein complexes involved in the light reactions. Photosystem II captures light first and passes electrons along the electron transport chain.</w:t></w:r></w:p>
<w:p><w:r><w:t>Chapter 3: The Calvin Cycle (Light-Independent Reactions)</w:t></w:r></w:p>
<w:p><w:r><w:t>The Calvin cycle takes place in the stroma of the chloroplast. It uses the ATP and NADPH from the light reactions to fix carbon dioxide into glucose. The cycle has three stages: carbon fixation, reduction, and regeneration of RuBP.</w:t></w:r></w:p>
<w:p><w:r><w:t>The enzyme RuBisCO is responsible for carbon fixation. It is the most abundant enzyme on Earth and catalyses the reaction between CO2 and ribulose bisphosphate (RuBP).</w:t></w:r></w:p>
<w:p><w:r><w:t>Chapter 4: Factors Affecting Photosynthesis</w:t></w:r></w:p>
<w:p><w:r><w:t>The rate of photosynthesis is affected by several limiting factors: light intensity, carbon dioxide concentration, and temperature. Increasing light intensity increases the rate of photosynthesis up to a saturation point. Beyond that, CO2 concentration or temperature becomes the limiting factor.</w:t></w:r></w:p>
<w:p><w:r><w:t>Chlorophyll absorbs mainly red and blue wavelengths of light. Green light is mostly reflected, which is why plants appear green. Different pigments like carotenoids and xanthophylls help absorb additional wavelengths.</w:t></w:r></w:p>
<w:p><w:r><w:t>Chapter 5: C3, C4, and CAM Plants</w:t></w:r></w:p>
<w:p><w:r><w:t>C3 plants such as wheat and rice fix CO2 directly via RuBisCO into a 3-carbon compound. C4 plants such as corn and sugarcane pre-fix CO2 in mesophyll cells into a 4-carbon compound to reduce photorespiration. CAM plants such as cacti open stomata only at night to conserve water while still fixing CO2.</w:t></w:r></w:p>
</w:body>
</w:document>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const zip = new JSZip();
zip.file('[Content_Types].xml', contentTypes);
zip.file('_rels/.rels', rels);
zip.file('word/document.xml', wordContent);

zip.generateAsync({ type: 'nodebuffer' }).then(buf => {
  fs.writeFileSync('test_photosynthesis.docx', buf);
  console.log('SUCCESS: Created test_photosynthesis.docx');
});
