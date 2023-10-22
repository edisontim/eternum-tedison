import { useEffect, useMemo, useState } from "react";
import { Tabs } from "../../../elements/tab";
import { NpcPanel } from "./villagers/NpcPanel";
import useRealmStore from "../../../hooks/store/useRealmStore";
import useUIStore from "../../../hooks/store/useUIStore";
import { useRoute, useLocation } from "wouter";

type RealmVillagersComponentProps = {};

export const RealmNpcComponent = ({}: RealmVillagersComponentProps) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const { realmEntityId } = useRealmStore();

  const moveCameraToLaborView = useUIStore((state) => state.moveCameraToLaborView);
  const moveCameraToFoodView = useUIStore((state) => state.moveCameraToFoodView);
  const setTooltip = useUIStore((state) => state.setTooltip);

  // @ts-ignore
  const [location, setLocation] = useLocation();
  // @ts-ignore
  const [match, params]: any = useRoute("/realm/:id/:tab");

  useEffect(() => {
    let _tab: string = "";
    if (["farmers"].includes(params?.tab as string)) {
      //   _tab = "farmers";
      moveCameraToFoodView();
    } else {
      //   _tab = params?.tab as any;
      moveCameraToLaborView();
    }
    const tabIndex = tabs.findIndex((tab) => tab.key === _tab);
    if (tabIndex >= 0) {
      setSelectedTab(tabIndex);
    }
  }, [params]);

  const tabs = useMemo(
    () => [
      {
        key: "villagers",
        label: <div>All</div>,
        component: <NpcPanel />,
      },
      //   {
      //     key: "farmers",
      //     label: (
      //       <div className="flex flex-col items-center">
      //         <div>Farmers</div>
      //       </div>
      //     ),
      //     component: <NpcPanel type="farmers" />,
      //   },
      //   {
      //     key: "miners",
      //     label: (
      //       <div className="flex flex-col items-center">
      //         <div>Miners</div>
      //       </div>
      //     ),
      //     component: <NpcPanel type="miners" />,
      //   },
    ],
    [selectedTab],
  );

  return (
    <>
      <Tabs
        selectedIndex={selectedTab}
        onChange={(index: any) => setLocation(`/realm/${realmEntityId}/${tabs[index].key}`)}
        variant="default"
        className="h-full"
      >
        <Tabs.List>
          {tabs.map((tab, index) => (
            <Tabs.Tab key={index}>{tab.label}</Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panels className="overflow-hidden">
          {tabs.map((tab, index) => (
            <Tabs.Panel key={index}>{tab.component}</Tabs.Panel>
          ))}
        </Tabs.Panels>
      </Tabs>
    </>
  );
};

export default RealmNpcComponent;
