import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const nicknameChanged = functions.firestore
  .document('/users/{id}')
  .onUpdate((snap, context) => {
    let user: any = null;

    if (snap.after) {
      user = snap.after.data();
    }
    const userId = context.params.id;

    return admin
      .firestore()
      .collection(`users/${userId}/groups`)
      .get()
      .then(
        (user_groups) => {
          user_groups.docs.forEach((doc) => {
            const group_id = doc.data().id;

            admin
              .firestore()
              .doc(`groups/${group_id}`)
              .get()
              .then(
                (group) => {
                  console.log('group data: ', group.data());
                  let members = [];
                  const data = group.data();

                  if (data) {
                    members = data['users'];
                  }

                  console.log('members: ', members);
                  for (const mem of members) {
                    if (mem.id === userId) {
                      mem.nickname = user.nickname;
                    }
                  }

                  group.ref
                    .update({
                      users: members
                    })
                    .then(
                      (res) => {
                        console.log('after nick update: ', res);
                      },
                      (err) => {
                        console.log('update err: ', err);
                      }
                    );
                },
                (err) => {
                  console.log('groups doc err: ', err);
                }
              );
          });
        },
        (err) => {
          console.log('err: ', err);
        }
      );
  });
