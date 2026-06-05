import { Client } from 'pg';
import { validateMobileExperienceConfig } from '../../shared-types/mobile-config';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://fatihkartal@localhost:5432/endemigo'
  });
  
  await client.connect();
  
  try {
    console.log('Fetching the latest mobile config document...');
    const res = await client.query('SELECT id, draft FROM mobile_config_documents ORDER BY "createdAt" DESC LIMIT 1');
    
    if (res.rows.length === 0) {
      console.log('No mobile config documents found.');
      return;
    }
    
    const doc = res.rows[0];
    let draft = typeof doc.draft === 'string' ? JSON.parse(doc.draft) : doc.draft;
    
    console.log('Validating draft...');
    const errors = validateMobileExperienceConfig(draft);
    
    if (errors.length > 0) {
      console.log('FOUND VALIDATION ERRORS:');
      console.log(JSON.stringify(errors, null, 2));
    } else {
      console.log('Draft is completely valid!');
    }

  } catch (err) {
    console.error('ERROR during diagnostics:', err);
  } finally {
    await client.end();
  }
}

main();
