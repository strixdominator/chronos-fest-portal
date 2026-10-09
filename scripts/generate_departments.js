const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const firstNames = [
  'Aarav', 'Aditi', 'Aditya', 'Aishwarya', 'Akash', 'Ananya', 'Anil', 'Aniruddh', 'Anjali', 'Arjun',
  'Ashwin', 'Bhavana', 'Chetan', 'Deepa', 'Deepak', 'Divya', 'Ganesh', 'Gautam', 'Harish', 'Ishita',
  'Kavya', 'Kiran', 'Kishan', 'Kruthi', 'Madhuri', 'Manish', 'Meghana', 'Manoj', 'Naveen', 'Neha',
  'Nikhil', 'Nithya', 'Pooja', 'Pradeep', 'Prajwal', 'Pranav', 'Prathik', 'Priya', 'Rahul', 'Rakshith',
  'Rani', 'Rishabh', 'Ritu', 'Rohan', 'Rohit', 'Sahana', 'Sanjay', 'Santosh', 'Shalini', 'Sharath',
  'Shashank', 'Shilpa', 'Shreya', 'Siddharth', 'Sindhu', 'Sneha', 'Soumya', 'Suhas', 'Sunil', 'Suraj',
  'Sushma', 'Tanvi', 'Tarun', 'Tejas', 'Uday', 'Vaishnavi', 'Varun', 'Venkatesh', 'Vidya', 'Vijay',
  'Vikas', 'Vinay', 'Vinod', 'Vishal', 'Yashaswini', 'Yashwanth'
];

const lastNames = [
  'Bhat', 'Gowda', 'Hegde', 'Kulkarni', 'Kumar', 'Murthy', 'Nair', 'Naik', 'Patil', 'Prasad',
  'Rao', 'Reddy', 'Shetty', 'Sharma', 'Singh', 'Suresh', 'Swamy', 'Verma', 'Acharya', 'Deshmukh'
];

const companies = [
  'Infosys', 'TCS', 'Wipro', 'Accenture', 'Cognizant', 'Capgemini', 'IBM', 'Oracle', 'SAP Labs',
  'Robert Bosch', 'L&T Technology Services', 'Siemens', 'Texas Instruments', 'Mercedes-Benz R&D',
  'Amazon', 'Microsoft', 'Dell Technologies', 'Cisco Systems', 'Goldman Sachs', 'JPMorgan Chase',
  'Schneider Electric', 'Honeywell', 'Tata Elxsi', 'Sobha Developers', 'KPMG', 'EY India'
];

const techRoles = [
  'Software Engineer', 'Associate Consultant', 'Data Analyst', 'Systems Engineer', 'Cloud Developer',
  'Backend Engineer', 'DevOps Specialist', 'Quality Engineer', 'Technical Lead'
];

const coreRoles = [
  'Design Engineer', 'Project Coordinator', 'Structural Engineer', 'Site Supervisor', 'Electrical Engineer',
  'Automation Specialist', 'Mechanical Consultant', 'R&D Engineer', 'Operations Analyst'
];

const mgmtRoles = [
  'Business Analyst', 'Product Associate', 'Management Consultant', 'HR Operations Lead', 'Financial Analyst',
  'Marketing Specialist', 'Supply Chain Analyst', 'Operations Manager'
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomPhone() {
  const prefixes = ['98450', '98800', '99000', '97400', '94480', '99800', '96110', '97390', '91080', '80880'];
  const prefix = getRandomElement(prefixes);
  const suffix = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}${suffix}`;
}

const departmentsConfig = [
  {
    fileName: 'ISE.xlsx',
    deptName: 'Information Science & Engineering',
    deptCode: 'IS',
    batches: ['2021', '2022', '2023', '2024', '2025'],
    roles: techRoles,
    studentsPerBatch: 25
  },
  {
    fileName: 'AIDS.xlsx',
    deptName: 'Artificial Intelligence & Data Science',
    deptCode: 'AD',
    batches: ['2022', '2023', '2024', '2025'],
    roles: ['Data Scientist', 'AI Engineer', 'ML Specialist', 'Data Analyst', 'Big Data Developer'],
    studentsPerBatch: 22
  },
  {
    fileName: 'AIML.xlsx',
    deptName: 'Artificial Intelligence & Machine Learning',
    deptCode: 'AM',
    batches: ['2022', '2023', '2024', '2025'],
    roles: ['Machine Learning Engineer', 'Deep Learning Specialist', 'Computer Vision Engineer', 'AI Developer', 'Data Associate'],
    studentsPerBatch: 22
  },
  {
    fileName: 'ECE.xlsx',
    deptName: 'Electronics & Communication Engineering',
    deptCode: 'EC',
    batches: ['2020', '2021', '2022', '2023', '2024', '2025'],
    roles: ['Embedded Systems Engineer', 'VLSI Design Engineer', 'Telecom Analyst', 'Hardware Test Engineer', 'Software Developer'],
    studentsPerBatch: 25
  },
  {
    fileName: 'MECH.xlsx',
    deptName: 'Mechanical Engineering',
    deptCode: 'ME',
    batches: ['2019', '2020', '2021', '2022', '2023', '2024'],
    roles: coreRoles,
    studentsPerBatch: 22
  },
  {
    fileName: 'CIVIL.xlsx',
    deptName: 'Civil Engineering',
    deptCode: 'CV',
    batches: ['2019', '2020', '2021', '2022', '2023', '2024'],
    roles: ['Site Engineer', 'Structural Analyst', 'BIM Modeler', 'Quality Surveyor', 'Urban Planning Associate'],
    studentsPerBatch: 20
  },
  {
    fileName: 'EEE.xlsx',
    deptName: 'Electrical & Electronics Engineering',
    deptCode: 'EE',
    batches: ['2019', '2020', '2021', '2022', '2023', '2024'],
    roles: ['Power Systems Engineer', 'Substation Analyst', 'Electrical Designer', 'Control Systems Engineer', 'Automation Lead'],
    studentsPerBatch: 20
  },
  {
    fileName: 'TCE.xlsx',
    deptName: 'Telecommunication Engineering',
    deptCode: 'TE',
    batches: ['2018', '2019', '2020', '2021', '2022'],
    roles: ['Network Engineer', 'RF Engineer', 'Telecom Systems Analyst', '5G Specialist', 'Optical Systems Engineer'],
    studentsPerBatch: 18
  },
  {
    fileName: 'MBA.xlsx',
    deptName: 'Master of Business Administration',
    deptCode: 'MBA',
    batches: ['2021', '2022', '2023', '2024', '2025'],
    roles: mgmtRoles,
    studentsPerBatch: 20
  },
  {
    fileName: 'MTECH.xlsx',
    deptName: 'Master of Technology (Computer Science / VLSI)',
    deptCode: 'SCS',
    batches: ['2021', '2022', '2023', '2024', '2025'],
    roles: ['Senior Architect', 'Research Engineer', 'VLSI Architect', 'Principal Consultant', 'AI Researcher'],
    studentsPerBatch: 15
  }
];

function generateDepartmentWorkbook(config) {
  const wb = XLSX.utils.book_new();

  config.batches.forEach(batchYear => {
    const yrInt = parseInt(batchYear, 10);
    // Joining year is roughly batchYear - 4 for UG, batchYear - 2 for PG
    const isPG = config.deptCode === 'MBA' || config.deptCode === 'SCS';
    const joinYear = isPG ? yrInt - 2 : yrInt - 4;
    const yearDigits = String(joinYear).slice(-2);

    const sheetData = [
      [],
      [`DEPARTMENT OF ${config.deptName.toUpperCase()}`],
      [`ALUMNI DATA COLLECTION OF BATCH PASSED OUT IN ${batchYear}`],
      [`No. of students registered in ${batchYear} = ${config.studentsPerBatch}`],
      [],
      ['Contact & Official Directory Details'],
      [
        'Sl. No. ',
        'Name',
        'USN ',
        'Branch',
        'Primary Contact',
        'Alternate Contact',
        'Primary Email',
        'Alternate Email',
        'Name of Organisation ',
        'Designation '
      ]
    ];

    for (let i = 1; i <= config.studentsPerBatch; i++) {
      const fName = getRandomElement(firstNames);
      const lName = getRandomElement(lastNames);
      const fullName = `${fName} ${lName}`;
      const serialStr = String(i).padStart(3, '0');
      const usn = `1DB${yearDigits}${config.deptCode}${serialStr}`;
      const emailDomain = (i % 3 === 0) ? 'gmail.com' : 'yahoo.com';
      const cleanName = `${fName.toLowerCase()}.${lName.toLowerCase()}${i}`;
      const email = `${cleanName}@${emailDomain}`;
      const phone = getRandomPhone();
      const altPhone = getRandomPhone();
      const company = getRandomElement(companies);
      const role = getRandomElement(config.roles);

      sheetData.push([
        i,
        fullName,
        usn,
        config.deptCode,
        phone,
        altPhone,
        email,
        `${fName.toLowerCase()}.${config.deptCode.toLowerCase()}@alumni.dbit.edu`,
        company,
        role
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Auto set column widths
    ws['!cols'] = [
      { wch: 8 },  // Sl No
      { wch: 26 }, // Name
      { wch: 15 }, // USN
      { wch: 10 }, // Branch
      { wch: 16 }, // Contact
      { wch: 16 }, // Alt Contact
      { wch: 32 }, // Email
      { wch: 32 }, // Alt Email
      { wch: 25 }, // Org
      { wch: 25 }  // Desig
    ];

    XLSX.utils.book_append_sheet(wb, ws, batchYear);
  });

  const filePath = path.join(DATA_DIR, config.fileName);
  XLSX.writeFile(wb, filePath);
  console.log(`Generated ${config.fileName} with ${config.batches.length} sheets in ${filePath}`);
}

console.log('Generating Department Alumni Workbooks...');
departmentsConfig.forEach(cfg => generateDepartmentWorkbook(cfg));
console.log('All 10 department Excel workbooks created successfully!');
