import { rain, $, $$ } from "rainwc";

rain("simple-message", function () {
  const [count, setCount] = $(0);

  // Create a reactive object nested 3 levels deep
  const [nestedData, setNestedData] = $({
    level1: {
      level2: {
        level3: {
          value: "Initial deep value",
          timestamp: Date.now(),
        },
      },
    },
  });

  // Get page data signal
  const pd = $$.page;

  // Get loading state
  const loading = $$.loading;

  // Create computed for the deep nested value
  const deepValue = $.c(() => nestedData().level1.level2.level3.value);

  return () => (
    <div>
      <h1>Test</h1>
      <button onClick={() => setCount(count() + 1)}>Count: {count}</button>
      <button
        onClick={() =>
          setNestedData({
            level1: {
              level2: {
                level3: {
                  value: `Updated at ${new Date().toLocaleTimeString()}`,
                  timestamp: Date.now(),
                },
              },
            },
          })
        }
      >
        Update Nested
      </button>
      <button onClick={() => $$.update()} disabled={loading}>
        {$.c(() => (loading() ? "Loading..." : "Update Message"))}
      </button>
      <p>Count: {count}</p>
      <p>Deep Value: {deepValue}</p>
      <p>Message: {$.c(() => pd().message)}</p>
      <p>Loading: {loading() ? "Yes" : "No"}</p>
    </div>
  );
});
