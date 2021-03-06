'use strict';

import * as React from 'react';
import { connect } from 'react-redux';

import { IStateGlobal } from 'chord/workbench/api/common/state/stateGlobal';

import Menu from 'chord/workbench/parts/menu/browser/component/menu';

import { handleAddLibraryArtist } from 'chord/workbench/parts/mainView/browser/action/addLibraryItem';


function ArtistMenu({ item, view, top, left, handleAddLibraryItem }) {
    return view == 'artistMenuView' ?
        <Menu item={item} name='Artist' top={top} left={left} handleAddLibraryItem={handleAddLibraryItem} toQueue={true} /> : null;
}


function mapStateToProps(state: IStateGlobal) {
    let { artist, top, left } = state.menu.artistMenu;
    return {
        item: artist,
        top,
        left,
        view: state.menu.view,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        handleAddLibraryItem: (artist) => dispatch(handleAddLibraryArtist(artist)),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ArtistMenu);
