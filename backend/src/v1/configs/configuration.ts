interface IConfig {
  port: number;
  database: {
    uri: string;
  };
  jwtSecret: string;
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
  admin: {
    email: string;
    password: string;
    name: string;
  };
}

const port = process.env['PORT'];
const uri = process.env['MONGODB_URI'];

export default (): IConfig => {
  return {
    port: port ? parseInt(port, 10) : 5000,
    database: {
      uri: uri ? uri : 'mongodb://localhost:27017/haircare-product',
    },
    jwtSecret: process.env['JWT_SECRET'] || 'haircare_jwt_secret_key',
    smtp: {
      host: process.env['SMTP_HOST'] || 'smtp.gmail.com',
      port: parseInt(process.env['SMTP_PORT'] || '587', 10),
      user: process.env['SMTP_USER'] || '',
      pass: process.env['SMTP_PASS'] || '',
    },
    admin: {
      email: process.env['ADMIN_EMAIL'] || 'admin@gmail.com',
      password: process.env['ADMIN_PASSWORD'] || 'admin@123',
      name: process.env['ADMIN_NAME'] || 'Admin',
    },
  };
};

