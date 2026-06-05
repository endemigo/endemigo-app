const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://fatihkartal@localhost:5432/endemigo'
  });
  
  await client.connect();
  
  try {
    console.log('Fetching the latest mobile config document...');
    const res = await client.query('SELECT id, draft, published, version FROM mobile_config_documents ORDER BY "createdAt" DESC LIMIT 1');
    
    if (res.rows.length === 0) {
      console.log('No mobile config documents found.');
      return;
    }
    
    const doc = res.rows[0];
    let draft = typeof doc.draft === 'string' ? JSON.parse(doc.draft) : doc.draft;
    let published = typeof doc.published === 'string' ? JSON.parse(doc.published) : doc.published;
    
    console.log('Original hero banners count in draft:', draft.home?.heroBanners?.length);
    
    if (draft.home?.heroBanners) {
      // Filter out the home-hero-collection banner
      draft.home.heroBanners = draft.home.heroBanners.filter(b => b.id !== 'home-hero-collection');
    }
    
    if (published && published.home?.heroBanners) {
      published.home.heroBanners = published.home.heroBanners.filter(b => b.id !== 'home-hero-collection');
    }
    
    console.log('Updated hero banners count in draft:', draft.home?.heroBanners?.length);
    
    const newVersion = doc.version + 1;
    
    await client.query(
      'UPDATE mobile_config_documents SET draft = $1, published = $2, version = $3, "updatedAt" = NOW() WHERE id = $4',
      [JSON.stringify(draft), published ? JSON.stringify(published) : null, newVersion, doc.id]
    );
    
    console.log('SUCCESS: Active mobile draft updated in database! Hero Banner "home-hero-collection" has been successfully removed.');

  } catch (err) {
    console.error('ERROR updating mobile config database:', err);
  } finally {
    await client.end();
  }
}

main();
