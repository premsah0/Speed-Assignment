import prisma from '../config/prisma.js';

export const INITIAL_REVIEWS = [
  {
    name: "Sarah Jenkins",
    role: "Computer Science Major",
    review: "Speed Assignment helped me structure my final programming project report clearly. The writer followed all instructions and delivered two days before my deadline.",
    avatar: "img/testimonial-1.jpg",
    isActive: true,
  },
  {
    name: "David Miller",
    role: "Business Administration Student",
    review: "I was struggling with my case study analysis while working part-time. The team provided well-researched insights and accurate APA formatting throughout.",
    avatar: "img/testimonial-2.jpg",
    isActive: true,
  }
];

export const seedReviews = async () => {
  console.log('[Reviews Seed] Starting reviews database seed...');
  let createdCount = 0;
  let skippedCount = 0;

  for (const item of INITIAL_REVIEWS) {
    const existing = await prisma.review.findFirst({
      where: { name: item.name },
    });

    if (existing) {
      skippedCount++;
    } else {
      await prisma.review.create({
        data: item,
      });
      createdCount++;
    }
  }

  console.log(`[Reviews Seed] Complete. Created: ${createdCount}, Already Existed: ${skippedCount}`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  seedReviews()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Reviews Seed] Error:', err);
      process.exit(1);
    });
}
