import mongoose from 'mongoose';

const uri = 'mongodb://crm-admin:FRC2sCvP3Scrjxdw@ac-qy0tdwm-shard-00-00.ktwmf33.mongodb.net:27017,ac-qy0tdwm-shard-00-01.ktwmf33.mongodb.net:27017,ac-qy0tdwm-shard-00-02.ktwmf33.mongodb.net:27017/?ssl=true&replicaSet=atlas-24pdxc-shard-0&authSource=admin&retryWrites=true&w=majority&appName=StartUpCRMLite';

mongoose.connect(uri)
  .then(() => {
    console.log('Connected with standard URI!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection failed:', err.message);
    process.exit(1);
  });
