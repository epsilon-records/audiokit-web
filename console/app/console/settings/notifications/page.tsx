import type { Metadata } from "next";
import { SaveForm } from "@/components/save-form";
import { client } from "@/lib/api-client";

export const metadata: Metadata = { title: "Settings · Notifications" };

export default async function NotificationsSettingsPage() {
  const prefs = await client.getNotificationPreferences();

  return (
    <>
      <section className="panel">
        <div className="panel-bar">
          <span>Email preferences</span>
        </div>
        <div className="panel-body">
          <SaveForm submitLabel="Save preferences">
            <label className="check">
              <input type="checkbox" name="quotaWarnings" defaultChecked={prefs.quotaWarnings} />
              <span>
                <strong>Quota warnings</strong>
                <br />
                <span className="dim">At 80% and at the limit.</span>
              </span>
            </label>
            <label className="check">
              <input type="checkbox" name="paymentReceipts" defaultChecked={prefs.paymentReceipts} />
              <span>
                <strong>Payment receipts</strong>
                <br />
                <span className="dim">Always sent for charges and refunds.</span>
              </span>
            </label>
            <label className="check">
              <input type="checkbox" name="productUpdates" defaultChecked={prefs.productUpdates} />
              <span>
                <strong>Product updates</strong>
                <br />
                <span className="dim">Occasional news about new operations.</span>
              </span>
            </label>
          </SaveForm>
        </div>
      </section>
      <p className="caption">
        Transactional mail (receipts, security notices) can&apos;t be disabled.
      </p>
    </>
  );
}
