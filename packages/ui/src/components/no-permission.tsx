"use client";

const NoPermissionScreen = () => {
  return (
    <>
      <div className="space-y-6">
        <div className={"flex flex-col gap-2 pb-2"}>
          <h1 className={"text-xl font-semibold tracking-tight"}>
            You don’t have permission to use this feature
          </h1>
        </div>

        {/* <Section>
          <SectionContent>
            <DataTable
              columns={columns}
              data={dataCardGrouped}
              maxHeight={"70vh"}
            />
            <Drawer direction="right" open={openDrawer}>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>
                    {renderTitleDrawer(drawerType || "lock-card")}
                  </DrawerTitle>
                </DrawerHeader>
                <FormActionCard
                  card={cardEdit}
                  onCancelDrawer={handleCancelDrawer}
                  onSubmitCardSuccess={handleSuccessDrawer}
                />
              </DrawerContent>
            </Drawer>
          </SectionContent>
        </Section> */}
      </div>

      {/* <Head>
        <title></title>
      </Head>
      <Layout>
        <div className="py-5 d-flex justify-content-center align-items-center flex-column w-100">
          <div className="fw-600 fs-24 co-grey">
            You don’t have permission to use this feature
          </div>
        </div>
      </Layout> */}
    </>
  );
};

export default NoPermissionScreen;
