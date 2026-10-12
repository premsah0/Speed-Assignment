import prisma from '../config/prisma.js';

export const INITIAL_SERVICES = [
  {
    slug: 'essay-writing',
    title: 'Professional Essay Writing Service',
    description: 'Custom essays, argumentative papers, and admissions essays crafted by certified academic experts.',
    image: 'img/property-1.jpg',
    isActive: true,
  },
  {
    slug: 'research-paper',
    title: 'Research Paper & Thesis Assistance',
    description: 'In-depth research papers, literature reviews, and citations (APA, MLA, Harvard, Chicago).',
    image: 'img/property-2.jpg',
    isActive: true,
  },
  {
    slug: 'programming-coding',
    title: 'Programming & Coding Assignment Help',
    description: 'Expert solutions in Python, Java, C++, Web Development, Data Science, and SQL database.',
    image: 'img/property-3.jpg',
    isActive: true,
  },
  {
    slug: 'dissertation-thesis',
    title: "Dissertation & Master's Thesis Service",
    description: 'Complete dissertation assistance from research proposal to methodology, analysis, and conclusion.',
    image: 'img/property-4.jpg',
    isActive: true,
  },
  {
    slug: 'homework-coursework',
    title: 'Urgent Homework & Coursework Help',
    description: 'Fast, accurate solutions for daily coursework, lab reports, quizzes, and problem sets.',
    image: 'img/property-5.jpg',
    isActive: true,
  },
  {
    slug: 'case-study',
    title: 'Academic Case Study Analysis',
    description: 'Analytical case study reports, strategic business analyses, and executive summaries.',
    image: 'img/property-6.jpg',
    isActive: true,
  },
];

export const seedServices = async () => {
  console.log('[Services Seed] Starting services database seed...');
  let createdCount = 0;
  let skippedCount = 0;

  for (const service of INITIAL_SERVICES) {
    const existing = await prisma.service.findUnique({
      where: { slug: service.slug },
    });

    if (existing) {
      skippedCount++;
    } else {
      await prisma.service.create({
        data: service,
      });
      createdCount++;
    }
  }

  console.log(`[Services Seed] Complete. Created: ${createdCount}, Already Existed: ${skippedCount}`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  seedServices()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Services Seed] Error:', err);
      process.exit(1);
    });
}
