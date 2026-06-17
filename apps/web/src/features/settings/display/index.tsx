import { ContentSection } from "../components/content-section";
import { DisplayForm } from "./display-form";

export default function SettingsDisplay() {
  return (
    <ContentSection
      title="Отображение"
      desc="Включайте и выключайте элементы для управления содержимым приложения."
    >
      <DisplayForm />
    </ContentSection>
  );
}
