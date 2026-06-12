const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://fatihkartal@localhost:5432/endemigo'
  });
  
  await client.connect();
  
  try {
    const res = await client.query('SELECT * FROM mobile_config_documents');
    console.log(`Found ${res.rows.length} documents`);
    
    for (const row of res.rows) {
      console.log('Updating document ID:', row.id);
      
      const draft = row.draft;
      const published = row.published;
      
      const newSlot = {
        id: 'home-category-products',
        type: 'SURFACE_SLOT',
        surface: 'HOME',
        enabled: true,
        order: 33,
        audiences: ['GUEST', 'BUYER', 'SELLER'],
        title: { tr: 'Kategori Ürünleri', en: 'Category Products' },
        subtitle: { tr: '', en: '' },
        cta: { route: '', label: { tr: '', en: '' } }
      };

      const newSection = {
        id: 'category-products',
        type: 'HOME_SECTION',
        surface: 'HOME',
        enabled: true,
        order: 33,
        audiences: ['GUEST', 'BUYER', 'SELLER'],
        title: { tr: 'Kategori Ürünleri', en: 'Category Products' },
        seeAllLabel: { tr: 'Tümünü Gör', en: 'See All' },
        route: '/(tabs)/categories'
      };
      
      // Update draft config
      if (draft && Array.isArray(draft.otherSurfaces)) {
        // Remove if existing
        draft.otherSurfaces = draft.otherSurfaces.filter(s => s.id !== 'home-category-products');
        // Add new slot
        draft.otherSurfaces.push(newSlot);
        
        // Re-assign orders to keep them clean
        draft.otherSurfaces.forEach(s => {
          if (s.id === 'home-recently-viewed') {
            s.order = 30;
          } else if (s.id === 'home-listings') {
            s.order = 31;
          } else if (s.id === 'home-categories') {
            s.order = 32;
          } else if (s.id === 'home-category-products') {
            s.order = 33;
          } else if (s.id === 'home-discounted-products') {
            s.order = 34;
          } else if (s.id === 'home-most-liked-products') {
            s.order = 35;
          } else if (s.id === 'home-campaigns') {
            s.order = 36;
          } else if (s.id === 'home-blog') {
            s.order = 37;
          } else if (s.id === 'home-trust-hub') {
            s.order = 38;
          }
        });
        
        draft.otherSurfaces.sort((a, b) => a.order - b.order);
      }

      if (draft && draft.home && Array.isArray(draft.home.sections)) {
        draft.home.sections = draft.home.sections.filter(s => s.id !== 'category-products');
        draft.home.sections.push(newSection);

        draft.home.sections.forEach(s => {
          if (s.id === 'categories') {
            s.order = 32;
          } else if (s.id === 'category-products') {
            s.order = 33;
          } else if (s.id === 'discounted-products') {
            s.order = 34;
          } else if (s.id === 'most-liked-products') {
            s.order = 35;
          } else if (s.id === 'campaigns') {
            s.order = 36;
          } else if (s.id === 'blog') {
            s.order = 37;
          } else if (s.id === 'trust-hub') {
            s.order = 38;
          }
        });

        draft.home.sections.sort((a, b) => a.order - b.order);
      }
      
      // Update published config
      if (published && Array.isArray(published.otherSurfaces)) {
        // Remove if existing
        published.otherSurfaces = published.otherSurfaces.filter(s => s.id !== 'home-category-products');
        // Add new slot
        published.otherSurfaces.push(newSlot);
        
        // Re-assign orders to keep them clean
        published.otherSurfaces.forEach(s => {
          if (s.id === 'home-recently-viewed') {
            s.order = 30;
          } else if (s.id === 'home-listings') {
            s.order = 31;
          } else if (s.id === 'home-categories') {
            s.order = 32;
          } else if (s.id === 'home-category-products') {
            s.order = 33;
          } else if (s.id === 'home-discounted-products') {
            s.order = 34;
          } else if (s.id === 'home-most-liked-products') {
            s.order = 35;
          } else if (s.id === 'home-campaigns') {
            s.order = 36;
          } else if (s.id === 'home-blog') {
            s.order = 37;
          } else if (s.id === 'home-trust-hub') {
            s.order = 38;
          }
        });
        
        published.otherSurfaces.sort((a, b) => a.order - b.order);
      }

      if (published && published.home && Array.isArray(published.home.sections)) {
        published.home.sections = published.home.sections.filter(s => s.id !== 'category-products');
        published.home.sections.push(newSection);

        published.home.sections.forEach(s => {
          if (s.id === 'categories') {
            s.order = 32;
          } else if (s.id === 'category-products') {
            s.order = 33;
          } else if (s.id === 'discounted-products') {
            s.order = 34;
          } else if (s.id === 'most-liked-products') {
            s.order = 35;
          } else if (s.id === 'campaigns') {
            s.order = 36;
          } else if (s.id === 'blog') {
            s.order = 37;
          } else if (s.id === 'trust-hub') {
            s.order = 38;
          }
        });

        published.home.sections.sort((a, b) => a.order - b.order);
      }
      
      const updateRes = await client.query(
        'UPDATE mobile_config_documents SET draft = $1, published = $2, version = version + 1 WHERE id = $3 RETURNING version',
        [JSON.stringify(draft), JSON.stringify(published), row.id]
      );
      
      console.log('Update successful. New version:', updateRes.rows[0].version);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
