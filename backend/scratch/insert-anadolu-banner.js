const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://fatihkartal@localhost:5432/endemigo'
  });
  
  await client.connect();
  
  try {
    const bannerId = '919d43ef-118e-4a87-b9cd-0925afde7c04';
    const slug = 'anadolu-bereket';
    
    // Clear existing to avoid unique constraint violations
    await client.query("DELETE FROM banners WHERE slug = $1", [slug]);
    
    const bannerItems = [
      {
        id: 'slide-anadolu-1',
        imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=675&fit=crop',
        actionType: 'CATEGORY',
        actionValue: '/(tabs)/categories',
        title: { 
          tr: "Anadolu'nun Bereketli Topraklarından", 
          en: 'From the fertile lands of Anatolia' 
        },
        subtitle: { 
          tr: 'Coğrafi işaretli ürünler kapınıza gelsin', 
          en: 'Discover geographically indicated local goods' 
        },
        requireConfirmation: false,
        confirmationText: { tr: '', en: '' },
        confirmationButtonText: { tr: 'Keşfet', en: 'Explore' }
      }
    ];

    console.log('Inserting "Anadolu\'nun Bereketli Topraklarından" banner into database...');
    
    await client.query(`
      INSERT INTO banners (id, name, slug, "slideDuration", "aspectRatio", items, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `, [
      bannerId,
      "Anadolu'nun Bereketli Topraklarından",
      slug,
      3000,
      '16:9',
      JSON.stringify(bannerItems)
    ]);
    
    console.log('SUCCESS: Banner campaign seeded successfully into database!');

  } catch (err) {
    console.error('ERROR seeding banner:', err);
  } finally {
    await client.end();
  }
}

main();
