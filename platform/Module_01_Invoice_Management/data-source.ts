import { DataSource, DataSourceOptions } from "typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import * as path from "path";

// Import all entities. Ensure paths are correct relative to the dist folder after compilation.
// Adjust these paths if your entities are located elsewhere or your tsconfig.json output directory is different.
import { User } from "./auth/entities/user.entity";
import { Organization } from "./organizations/entities/organization.entity";
import { Invoice } from "./invoices/entities/invoice.entity";
import { InvoiceLineItem } from "./invoices/entities/invoice-line-item.entity";
import { InvoiceTemplate } from "./templates/entities/invoice-template.entity"; // Original template entity
import { InvoiceTemplateMaster } from "./templates/entities/invoice-template-master.entity";
import { InvoiceTemplateVersion } from "./templates/entities/invoice-template-version.entity";
import { UserDefinedDataSource } from "./user-data-sources/entities/user-defined-data-source.entity";

// This is a simplified setup for CLI. In a full NestJS app, ConfigService is usually injected.
// For CLI, we might need to load .env variables differently or have a separate config for CLI.
// For simplicity, we will use environment variables directly here, assuming they are set.

ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
});

const configService = new ConfigService();

export const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  host: configService.get<string>("DB_HOST", "localhost"),
  port: configService.get<number>("DB_PORT", 5432),
  username: configService.get<string>("DB_USERNAME", "postgres"),
  password: configService.get<string>("DB_PASSWORD", "password"),
  database: configService.get<string>("DB_DATABASE", "invoice_agent_db"),
  entities: [
    User, 
    Organization, 
    Invoice, 
    InvoiceLineItem, 
    InvoiceTemplate, 
    InvoiceTemplateMaster, 
    InvoiceTemplateVersion, 
    UserDefinedDataSource
  ],
  // Path to migrations, relative to the project root (where package.json is)
  // TypeORM CLI expects paths relative to where it's run or configured in ormconfig.js/DataSource file.
  // If this file is in src/, and migrations are in src/migrations, this should work.
  migrations: [path.join(__dirname, "migrations/*{.ts,.js}")],
  synchronize: false, // IMPORTANT: Set to false when using migrations
  logging: configService.get<string>("NODE_ENV") === "development" ? ["query", "error"] : ["error"],
  // ssl: configService.get<string>("NODE_ENV") === "production" ? { rejectUnauthorized: false } : false, // Example for SSL
};

const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;

