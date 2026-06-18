# ExamGrid

ExamGrid is a comprehensive management system built to streamline the scheduling, attendance, and administration of examination staff and resources. It provides a robust platform for managing employees, branches, assignments, shift schedules, payments, and reporting.

🌍 **Live Application**: [https://examgridapp.vercel.app/](https://examgridapp.vercel.app/)

## 🚀 Features

- **Dashboard**: A centralized hub offering quick overviews and analytics of current operations.
- **Employee Management**: Keep track of staff, their roles, and details.
- **Shift Scheduling & Calendar**: Efficiently schedule employee shifts and view them in a user-friendly calendar layout.
- **Attendance Tracking**: Monitor and record employee attendance for their assigned shifts.
- **Assignments & Branches**: Manage examination branches and assignments seamlessly.
- **Payments & Pay Rates**: Define custom pay rates and manage automated or manual payment processing.
- **Reports & Audit Logs**: Generate comprehensive reports and maintain an audit log of system activities for accountability.
- **Settings & User Roles**: Manage application settings, user roles (e.g., Admin), and system configurations.

## 🛠️ Tech Stack

This project is built using modern web development technologies:

- **Framework**: [Next.js](https://nextjs.org) (App Router)
- **Library**: [React 19](https://react.dev)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/), [@base-ui/react](https://base-ui.com/)
- **Icons**: [Lucide React](https://lucide.dev)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Utilities**: `date-fns` for date manipulation, `jspdf` & `xlsx` for export functionalities.

## 💻 Getting Started

Follow these steps to set up the project locally:

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd ExamGrid/web
```

### 2. Install dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set up Environment Variables
Create a `.env.local` file in the root of the `web` directory and configure your Supabase variables and other environment secrets.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📦 Deployment

The application is deployed on [Vercel](https://vercel.com). Any changes pushed to the main branch are automatically built and deployed.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📄 License

This project is proprietary and confidential.
