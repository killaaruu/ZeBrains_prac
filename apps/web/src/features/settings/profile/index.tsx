import { ContentSection } from "../components/content-section";
import { ProfileForm } from "./profile-form";

export default function SettingsProfile() {
  return (
    <ContentSection title="Профиль" desc="Так вас увидят другие пользователи на сайте.">
      <ProfileForm />
    </ContentSection>
  );
}
