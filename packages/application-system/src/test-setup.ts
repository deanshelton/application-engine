import { ApplicationState } from "@repo/database";

module.exports = async () => {
  let items = await ApplicationState.scan().exec();
  await Promise.all(items.map((item) => item.delete()));
  const x = new ApplicationState({
    id: "global-setup",
    stringValue: "done",
  });
  await x.save();
};
