interface IConfig {
  port: number;
  database: {
    uri: string;
  };
  sessionConfig: typeof sessionConfig;
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
const sessionConfig = {
  secret: process.env['SESSION_SECRET'] || 'SESSION_SECRET',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 36000 },
};

export default (): IConfig => {
  return {
    port: port ? parseInt(port, 10) : 5000,
    database: {
      uri: uri ? uri : 'mongodb://localhost:27017/haircare-product',
    },
    sessionConfig,
    smtp: {
      host: process.env['SMTP_HOST'] || 'smtp.gmail.com',
      port: parseInt(process.env['SMTP_PORT'] || '587', 10),
      user: process.env['SMTP_USER'] || '',
      pass: process.env['SMTP_PASS'] || '',
    },
    admin: {
      email: process.env['ADMIN_EMAIL'] || 'admin@haircaremarket.com',
      password: process.env['ADMIN_PASSWORD'] || 'Admin@12345',
      name: process.env['ADMIN_NAME'] || 'Admin',
    },
  };
};
