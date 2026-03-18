"use client";

import { PageLayout } from "@/components/layouts/page-layout";
import { PageHeader, PageTitle } from "@/components/layouts/page-header";
import { Section, SectionContent } from "@/components/layouts/section";
import { ChangePasswordForm } from "./components/change-password-form";

export default function ChangePassword() {
  return (
    <PageLayout>
      <PageHeader>
        <PageTitle>Change Password</PageTitle>
      </PageHeader>

      <Section>
        <SectionContent>
          <ChangePasswordForm />
        </SectionContent>
      </Section>
    </PageLayout>
  );
}
