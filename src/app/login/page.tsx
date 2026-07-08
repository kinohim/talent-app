import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex justify-center py-12">
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-bold text-brand-700">talent-app ログイン</h1>
        <LoginForm />
      </div>
    </div>
  );
}
