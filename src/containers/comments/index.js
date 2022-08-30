import React, {useState, useMemo, useCallback, useRef, useEffect} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import propTypes from "prop-types";
import {useStore as useStoreRedux, useSelector as useSelectorRedux, shallowEqual} from "react-redux";
import actionsComments from "../../store-redux/comments/actions";
import useSelector from "../../hooks/use-selector";
import useInit from "../../hooks/use-init";
import listToTree from "../../utils/list-to-tree";
import treeToList from "../../utils/tree-to-list";
import CommentsList from "../../components/comments-list";
import CommentsListFooter from "../../components/comments-list-footer";
import CommentContainer from "../comment";
import insertToTree from "../../utils/insertToTree";

function CommentsContainer(props) {
  // Состояние отображения формы добавления комментария
  const [listFooter, setListFooter] = useState(true);
  // Состояние отображения формы добавления ответа, в качестве значения
  // устанавливается id комментария или пустая строка
  const [itemFooter, setItemFooter] = useState('');
  // ref для хранения отображаемого массива
  const ref = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();

  const storeRedux = useStoreRedux();

  const selectStore = useSelector(state => ({
    exists: state.session.exists
  }));

  const selectRedux = useSelectorRedux(state => ({
    items: state.comments.items,
    waiting: state.comments.waiting,
    error: state.comments.error
  }), shallowEqual);

  useInit(async () => {
    storeRedux.dispatch(actionsComments.load(props.id));
  }, [props.id]);

  useEffect(() => {
    return () => storeRedux.dispatch(actionsComments.clearItems());
  }, []);

  const callbacks = {
    postComment: useCallback(text => storeRedux.dispatch(actionsComments.post({
      text,
      parent: {
        _id: props.id,
        _type: "article"
      }
    })), []),
    link: useCallback(() => navigate('/login', {state: {back: location.pathname}}), []),
  };

  const renders = {
    comment: useCallback((comment, itemFooter) => ( 
      <CommentContainer 
        comment={comment} 
        itemFooter={itemFooter} 
        setListFooter={setListFooter} 
        setItemFooter={setItemFooter}
      />
    ), []) 
  };

  // Небольшая оптимизация рендера элементов при добавлении нового,
  // чтобы избежать ререндера всего списка
  const options = {
    comments: useMemo(() => {
      if (!selectRedux.items.length) 
        return ref.current;
      // Если первая загрузка комментариев, то используем уже готовые функции для построения иерархического списка
      else if (!ref.current.length) {
        // Добавлено предотвращение ошибки из-за дублируемости id товара и id комментария, 
        // хотя такого вроде не должно происходить
        let list = [{_id: props.id}, ...selectRedux.items];
        listToTree(list);
        ref.current = [
          ...treeToList(list[0].children.filter((item) => list[0]._id !== item._id), (item, level) => ({level: level, ...item}))
        ];
        return ref.current;
      } else {
        // Вставляем новый комментарий или ответ в иерархический список
        insertToTree(ref.current, selectRedux.items.at(-1));
        return ref.current;
      }
    }, [selectRedux.items]),
  };

  if (selectRedux.error) {
    alert(selectRedux.error);
    storeRedux.dispatch(actionsComments.clearError());
  }

  return (
    <CommentsList comments={options.comments} renderComment={renders.comment} itemFooter={itemFooter}>
      <CommentsListFooter 
        session={selectStore.exists} 
        link={callbacks.link} 
        postComment={callbacks.postComment}
        show={listFooter}
      />
    </CommentsList>
  );
}

CommentsContainer.propTypes = {
  id: propTypes.string.isRequired,
}

export default React.memo(CommentsContainer);